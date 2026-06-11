# ============================================================================
# Life OS - iniciar com o Windows
# ============================================================================
# Cria (ou remove) um atalho do launcher na pasta de Inicializacao do usuario
# (shell:startup). No boot, o servidor sobe em segundo plano SEM abrir o
# navegador (--no-open) - o celular ja consegue acessar mesmo sem ninguem
# logado no app. Nao precisa de administrador.
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\startup-windows.ps1
#       powershell -ExecutionPolicy Bypass -File scripts\startup-windows.ps1 -Remove

param([switch]$Remove)

$startupDir = [Environment]::GetFolderPath("Startup")
$shortcutPath = Join-Path $startupDir "Life OS.lnk"

if ($Remove) {
  if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force -Confirm:$false
    Write-Host "Atalho removido - o Life OS nao inicia mais com o Windows." -ForegroundColor Yellow
  } else {
    Write-Host "Nada a fazer: o atalho de inicializacao nao existe." -ForegroundColor Gray
  }
  exit 0
}

$root = Split-Path -Parent $PSScriptRoot
$bat = Join-Path $root "Life OS.bat"
if (-not (Test-Path $bat)) {
  Write-Host "Nao encontrei 'Life OS.bat' em $root" -ForegroundColor Red
  exit 1
}

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $env:ComSpec
$shortcut.Arguments = "/c `"`"$bat`" --no-open`""
$shortcut.WorkingDirectory = $root
$shortcut.WindowStyle = 7  # minimizado (a janela se fecha sozinha em seguida)
$icon = Join-Path $root "public\launcher\open.ico"
if (Test-Path $icon) { $shortcut.IconLocation = $icon }
$shortcut.Description = "Sobe o servidor do Life OS em segundo plano ao ligar o PC"
$shortcut.Save()

Write-Host "Pronto! O Life OS vai iniciar junto com o Windows (sem abrir o navegador)." -ForegroundColor Green
Write-Host "Atalho criado em: $shortcutPath" -ForegroundColor Gray
