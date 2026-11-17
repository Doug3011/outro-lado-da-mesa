# Ambiente de teste online: 1 mestre + N jogadores, cada um como uma
# instância Electron isolada nesta máquina (porta/perfil/CDP próprios),
# simulando "computadores diferentes" conectados pela mesma mesa (modo
# LAN do app, por endereço manual 127.0.0.1:<porta>).
#
# Uso: .\launch-cluster.ps1 [-Players 4] [-RepoPath "C:\Users\dougl\ordem-tabletop"]
# Depois de rodar, cada instância aparece em http://127.0.0.1:960N/json
# (protocolo CDP) pronta pra automação (ver join-table.mjs e
# apply-network-conditions.mjs nesta mesma pasta).

param(
  [int]$Players = 4,
  [string]$RepoPath = "C:\Users\dougl\ordem-tabletop"
)

$ErrorActionPreference = "Stop"
Remove-Item Env:\ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

$electronExe = Join-Path $RepoPath "desktop\node_modules\.bin\electron.cmd"
$mainJs = Join-Path $RepoPath "desktop\main.js"
$desktopDir = Join-Path $RepoPath "desktop"
$baseData = "C:\Users\dougl\AppData\Local\Temp\ordem_online_test"

# Mata qualquer instância anterior deste mesmo teste (reconhece pelo
# --user-data-dir apontando pra $baseData).
Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($baseData) } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Remove-Item -Recurse -Force $baseData -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $baseData | Out-Null

# Papel 0 = mestre; 1..N = jogadores. Porta HTTP própria (cada instância
# sobe seu próprio server.cjs local, igual o app real já faz pra jogador
# e mestre) + porta CDP própria pra automação/throttling.
$roles = @()
$roles += [PSCustomObject]@{ Name = "mestre"; HttpPort = 47401; CdpPort = 9601 }
for ($i = 1; $i -le $Players; $i++) {
  $roles += [PSCustomObject]@{ Name = "jogador$i"; HttpPort = 47401 + $i; CdpPort = 9601 + $i }
}

foreach ($r in $roles) {
  $dataDir = Join-Path $baseData $r.Name
  New-Item -ItemType Directory -Force $dataDir | Out-Null
  $env:ORDEM_PORT = "$($r.HttpPort)"
  $env:ORDEM_NO_OPEN = "1"
  $env:APPDATA = $dataDir
  Start-Process -FilePath $electronExe -ArgumentList $mainJs, "--remote-debugging-port=$($r.CdpPort)", "--user-data-dir=$dataDir" -WorkingDirectory $desktopDir
  Write-Host "lançado: $($r.Name) (http=$($r.HttpPort) cdp=$($r.CdpPort) data=$dataDir)"
}

Start-Sleep -Seconds 5
Write-Host "`nConferindo CDP de cada instância:"
foreach ($r in $roles) {
  try {
    $resp = Invoke-WebRequest -Uri "http://127.0.0.1:$($r.CdpPort)/json" -UseBasicParsing -TimeoutSec 5
    Write-Host "  $($r.Name): OK (cdp $($r.CdpPort))"
  } catch {
    Write-Host "  $($r.Name): FALHOU (cdp $($r.CdpPort)) - $($_.Exception.Message)"
  }
}

# Guarda o mapa de papéis/portas num JSON pra os outros scripts lerem.
$json = $roles | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot "cluster-roles.json"), $json, (New-Object System.Text.UTF8Encoding $false))
Write-Host "`nMapa salvo em cluster-roles.json"
