# Registers eFinSuite's receiver as a webhook on eFinSign.
#
# Usage (PowerShell):
#   $env:EFINSIGN_API_KEY = "efsk_live_..."   # the SAME key eFinSuite uses (EFINSIGN_API_KEY)
#   .\scripts\register-efinsuite-webhook.ps1
#
# It prints the webhook signing secret ONCE. Copy it into eFinSuite's
# EFINSIGN_WEBHOOK_SECRET function secret so signature verification passes.

$ErrorActionPreference = "Stop"

$Base = "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api"
$Key  = $env:EFINSIGN_API_KEY
# eFinSuite's public webhook receiver (project ref boskmqywofwekszhgryb).
$ReceiverUrl = "https://boskmqywofwekszhgryb.supabase.co/functions/v1/efinsign-webhook"

if (-not $Key) {
    Write-Host "Set the eFinSign API key first (the one eFinSuite uses):" -ForegroundColor Red
    Write-Host '  $env:EFINSIGN_API_KEY = "efsk_live_..."'
    exit 1
}

$body = @{
    url    = $ReceiverUrl
    events = @(
        "document.sent",
        "document.completed",
        "document.voided",
        "document.signer_signed",
        "document.signer_declined"
    )
} | ConvertTo-Json -Compress

$bodyPath = Join-Path $env:TEMP "efinsign-webhook-reg.json"
[System.IO.File]::WriteAllText($bodyPath, $body)

Write-Host "Registering webhook -> $ReceiverUrl" -ForegroundColor Cyan
$resp = curl.exe -s -X POST "$Base/webhooks" `
    -H "Authorization: Bearer $Key" `
    -H "Content-Type: application/json" `
    --data "@$bodyPath"
Write-Host $resp

$secret = ($resp | ConvertFrom-Json).data.secret
if ($secret) {
    Write-Host ""
    Write-Host "==================== COPY THIS ====================" -ForegroundColor Green
    Write-Host "EFINSIGN_WEBHOOK_SECRET = $secret"
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "Set it as a function secret in eFinSuite (Supabase project boskmqywofwekszhgryb):"
    Write-Host "  supabase secrets set EFINSIGN_WEBHOOK_SECRET=$secret --project-ref boskmqywofwekszhgryb"
} else {
    Write-Host "No secret returned - check the response above (maybe a webhook is already registered)." -ForegroundColor Yellow
}
