# Gera o instalador do "Outro Lado" (Setup.exe via electron-builder/NSIS).
# Rode a partir da raiz do projeto (ou de qualquer lugar — o script acha os
# caminhos sozinho). Precisa de Node.js no PATH.
#
# Uso:  powershell -File desktop\build-installer.ps1

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$desktop = Join-Path $root 'desktop'

Write-Host "1/4 - build do frontend (vite)..." -ForegroundColor Cyan
Push-Location $root
npm run build
Pop-Location

Write-Host "2/4 - copiando dist/ e server/main.cjs pra desktop/..." -ForegroundColor Cyan
Remove-Item -Recurse -Force (Join-Path $desktop 'dist') -ErrorAction SilentlyContinue
Copy-Item -Recurse (Join-Path $root 'dist') (Join-Path $desktop 'dist')
Copy-Item (Join-Path $root 'server\main.cjs') (Join-Path $desktop 'server.cjs') -Force

Write-Host "3/4 - npm install no desktop/ (baixa Electron na 1a vez, pode demorar)..." -ForegroundColor Cyan
Push-Location $desktop
npm install

Write-Host "4/4 - empacotando instalador (electron-builder)..." -ForegroundColor Cyan
npm run dist
Pop-Location

Write-Host ""
Write-Host "Pronto. Instalador em desktop\release\" -ForegroundColor Green
Get-ChildItem (Join-Path $desktop 'release') -Filter '*.exe' -ErrorAction SilentlyContinue | ForEach-Object {
  Write-Host ("  " + $_.Name + "  (" + [math]::Round($_.Length / 1MB, 1) + " MB)")
}
