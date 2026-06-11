# ============================================================================
# Life OS - libera o acesso pelo celular no Firewall do Windows
# ============================================================================
# Cria uma regra de ENTRADA para as portas do Life OS (3000-3011, o range que
# o launcher usa) apenas em redes PRIVADAS (sua casa). Roda 1x como
# administrador - se chamado sem elevacao, pede o UAC sozinho. Idempotente.
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\allow-firewall.ps1

param(
  [int]$PortStart = 3000,
  [int]$PortEnd = 3011
)

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
  Write-Host "Solicitando permissao de administrador (confirme a janela do Windows)..." -ForegroundColor Yellow
  Start-Process powershell -Verb RunAs -ArgumentList @(
    "-NoProfile", "-ExecutionPolicy", "Bypass",
    "-File", "`"$PSCommandPath`"",
    "-PortStart", $PortStart, "-PortEnd", $PortEnd
  )
  exit 0
}

$ruleName = "Life OS (acesso pelo celular)"

# Remove versoes antigas da regra antes de recriar (idempotencia).
try {
  Get-NetFirewallRule -DisplayName $ruleName -ErrorAction Stop | Remove-NetFirewallRule
} catch {}

New-NetFirewallRule `
  -DisplayName $ruleName `
  -Description "Permite que celulares e outros aparelhos da SUA rede Wi-Fi acessem o Life OS rodando neste PC." `
  -Direction Inbound `
  -Action Allow `
  -Protocol TCP `
  -LocalPort "$PortStart-$PortEnd" `
  -Profile Private, Domain | Out-Null

Write-Host ""
Write-Host "Pronto! Portas $PortStart-$PortEnd liberadas nas redes privadas." -ForegroundColor Green
Write-Host "Agora abra o endereco do QR code (Configuracoes -> Acesso Remoto) no celular." -ForegroundColor Gray
Write-Host ""
Start-Sleep -Seconds 3
