# ============================================================================
#  optimize-dev.ps1 -- acelera o dev no Windows (rode UMA VEZ, como ADMIN)
# ----------------------------------------------------------------------------
#  O Windows Defender escaneia em tempo real cada arquivo que o Node/Next
#  le e escreve (node_modules, .next tem DEZENAS de milhares de arquivos).
#  Isso e um dos maiores custos de compilacao no Windows. Este script exclui
#  as pastas do projeto e o cache no SSD do escaneamento em tempo real.
#
#  Como rodar (uma vez):
#    1. Menu Iniciar -> digite "PowerShell" -> clique "Executar como administrador"
#    2. cole:  & "G:\Projeto-Life-OS\scripts\optimize-dev.ps1"
#
#  Reverter (se quiser): Remove-MpPreference -ExclusionPath "<caminho>"
# ============================================================================

$ErrorActionPreference = "Stop"

# Raiz do projeto = pasta acima deste script.
$projectRoot = Split-Path -Parent $PSScriptRoot
$cacheRoot   = if ($env:LIFEOS_CACHE_DIR) { $env:LIFEOS_CACHE_DIR } else { "C:\LifeOS-cache" }

# Precisa de privilegios de administrador para mexer no Defender.
$isAdmin = ([Security.Principal.WindowsPrincipal] `
    [Security.Principal.WindowsIdentity]::GetCurrent() `
  ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)

if (-not $isAdmin) {
  Write-Host ""
  Write-Host "  Precisa rodar como ADMINISTRADOR." -ForegroundColor Yellow
  Write-Host "  Feche esta janela, abra o PowerShell como administrador e rode de novo:" -ForegroundColor Yellow
  Write-Host "    & `"$PSCommandPath`"" -ForegroundColor Cyan
  Write-Host ""
  exit 1
}

$paths = @($projectRoot, $cacheRoot) | Where-Object { $_ -and (Test-Path $_) }
$procs = @("node.exe", "next.exe", "npm.cmd", "esbuild.exe")

Write-Host ""
Write-Host "  Otimizando o Windows Defender para o dev..." -ForegroundColor Cyan

foreach ($p in $paths) {
  try {
    Add-MpPreference -ExclusionPath $p -ErrorAction Stop
    Write-Host "    [ok] pasta excluida: $p" -ForegroundColor Green
  } catch {
    Write-Host "    [!] falhou em $p : $($_.Exception.Message)" -ForegroundColor Red
  }
}

foreach ($proc in $procs) {
  try {
    Add-MpPreference -ExclusionProcess $proc -ErrorAction Stop
    Write-Host "    [ok] processo excluido: $proc" -ForegroundColor Green
  } catch {
    Write-Host "    [!] falhou em $proc : $($_.Exception.Message)" -ForegroundColor Red
  }
}

# Desliga a telemetria do Next (evita qualquer espera de rede no start).
$env:NEXT_TELEMETRY_DISABLED = "1"

Write-Host ""
Write-Host "  Pronto! O dev deve iniciar bem mais rapido agora." -ForegroundColor Green
Write-Host "  (As exclusoes valem para sempre, nao precisa rodar de novo.)" -ForegroundColor Gray
Write-Host ""
