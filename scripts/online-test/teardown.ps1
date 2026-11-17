# Encerra todas as instâncias do cluster de teste online (ver
# launch-cluster.ps1) — mata só os processos electron.exe que apontam
# pra pasta de dados deste teste, não mexe em nada mais.
$baseData = "C:\Users\dougl\AppData\Local\Temp\ordem_online_test"
Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -and $_.CommandLine.Contains($baseData) } |
  ForEach-Object {
    Write-Host "encerrando PID $($_.ProcessId)"
    Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
  }
Write-Host "cluster de teste online encerrado."
