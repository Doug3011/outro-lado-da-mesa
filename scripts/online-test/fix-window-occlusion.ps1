# Achado nesta sessão: rodar várias janelas do Electron empilhadas no
# mesmo desktop (launch-cluster.ps1) faz o Windows/Chromium marcar as
# janelas de baixo como "ocluídas" e congelar o render delas (document.
# visibilityState fica "hidden" pra sempre, até o <canvas> trava no
# tamanho padrão do HTML, 300x150, nunca desenha nada de verdade) — isso
# quebra qualquer teste que dependa de captura de tela real (ex.: a
# transmissão WebRTC da mesa 3D pela internet, que usa canvas.captureStream()
# do lado do mestre). SetForegroundWindow sozinho NÃO resolve; só
# minimizar e restaurar força o Chromium a recalcular a oclusão direito.
#
# Uso: .\fix-window-occlusion.ps1 -CdpPort 9601
# (lê cluster-roles.json pra achar o PID certo a partir da porta CDP)

param(
  [Parameter(Mandatory = $true)][int]$CdpPort
)

Add-Type @'
using System;
using System.Runtime.InteropServices;
public class OrdemWin32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@

$proc = Get-CimInstance Win32_Process -Filter "Name='electron.exe'" |
  Where-Object { $_.CommandLine -match "remote-debugging-port=$CdpPort(\D|$)" } |
  ForEach-Object { Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue } |
  Where-Object { $_.MainWindowHandle -ne 0 } |
  Select-Object -First 1

if (-not $proc) {
  Write-Host "Não achei uma janela com MainWindowHandle pra porta CDP $CdpPort"
  exit 1
}

[OrdemWin32]::ShowWindow($proc.MainWindowHandle, 6) | Out-Null   # SW_MINIMIZE
Start-Sleep -Milliseconds 400
[OrdemWin32]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null   # SW_RESTORE
[OrdemWin32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
Write-Host "Janela da porta CDP $CdpPort (PID $($proc.Id)) restaurada/desocluída."
