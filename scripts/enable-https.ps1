# Habilita HTTPS local para o Life OS (PWA completo fora de localhost).
# ASCII puro - PowerShell 5.1 le ANSI sem BOM (regra do projeto).
#
# O que faz:
#   1. Detecta o Tailscale e, se presente, gera o certificado da maquina
#      (tailscale cert) na pasta .\certs\
#   2. Sem Tailscale: orienta o uso do mkcert (rede local).
#   3. Mostra o comando do proxy HTTPS (scripts/https-proxy.mjs).
#
# Uso:  powershell -ExecutionPolicy Bypass -File scripts\enable-https.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$certsDir = Join-Path $root "certs"

Write-Host ""
Write-Host "=== Life OS - HTTPS local ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path $certsDir)) { New-Item -ItemType Directory -Path $certsDir | Out-Null }

$tailscale = $null
try { $tailscale = (Get-Command tailscale -ErrorAction Stop).Source } catch {}
if (-not $tailscale) {
    $guess = Join-Path $env:ProgramFiles "Tailscale\tailscale.exe"
    if (Test-Path $guess) { $tailscale = $guess }
}

if ($tailscale) {
    Write-Host "[1/2] Tailscale encontrado. Descobrindo o nome da maquina..." -ForegroundColor Yellow
    $status = & $tailscale status --json | ConvertFrom-Json
    $dnsName = $status.Self.DNSName.TrimEnd(".")
    if (-not $dnsName) {
        Write-Host "Nao consegui descobrir o DNSName. O Tailscale esta logado? (tailscale up)" -ForegroundColor Red
        exit 1
    }
    Write-Host "      Maquina: $dnsName"

    $crt = Join-Path $certsDir "$dnsName.crt"
    $key = Join-Path $certsDir "$dnsName.key"
    Write-Host "[2/2] Gerando certificado (pode pedir habilitar HTTPS no painel do Tailscale)..." -ForegroundColor Yellow
    & $tailscale cert --cert-file $crt --key-file $key $dnsName
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Falhou. Habilite HTTPS no painel: https://login.tailscale.com/admin/dns (HTTPS Certificates)" -ForegroundColor Red
        exit 1
    }

    Write-Host ""
    Write-Host "Pronto! Inicie o proxy com:" -ForegroundColor Green
    Write-Host ""
    Write-Host "  node scripts\https-proxy.mjs --cert `"$crt`" --key `"$key`"" -ForegroundColor White
    Write-Host ""
    Write-Host "E acesse no celular (com Tailscale instalado): https://${dnsName}:3443" -ForegroundColor White
} else {
    Write-Host "Tailscale nao encontrado." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opcao A (recomendada) - Tailscale (acesso de QUALQUER lugar):"
    Write-Host "  1. Instale em https://tailscale.com/download (PC e celular)"
    Write-Host "  2. Rode este script de novo"
    Write-Host ""
    Write-Host "Opcao B - mkcert (so na rede Wi-Fi de casa):"
    Write-Host "  1. winget install FiloSottile.mkcert"
    Write-Host "  2. mkcert -install"
    Write-Host "  3. mkcert -cert-file certs\lan.crt -key-file certs\lan.key <IP-do-PC>"
    Write-Host "  4. node scripts\https-proxy.mjs --cert certs\lan.crt --key certs\lan.key"
    Write-Host "  (instale a CA do mkcert tambem no celular para nao dar aviso)"
}
Write-Host ""
