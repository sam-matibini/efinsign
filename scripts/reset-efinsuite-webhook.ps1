# Resets the eFinSuite webhook on eFinSign: deletes ALL existing webhooks
# (clearing duplicates and any that hit the failure_count cap), then registers
# exactly one fresh webhook and prints its signing secret.
#
# Usage (PowerShell) — use the SAME key eFinSuite uses (EFINSIGN_API_KEY):
#   $env:EFINSIGN_API_KEY = "efsk_live_..."
#   .\scripts\reset-efinsuite-webhook.ps1

$ErrorActionPreference = "Stop"

$Base = "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api"
$Key  = $env:EFINSIGN_API_KEY
$ReceiverUrl = "https://boskmqywofwekszhgryb.supabase.co/functions/v1/efinsign-webhook"

if (-not $Key) {
    Write-Host "Set the eFinSign API key first (the one eFinSuite uses):" -ForegroundColor Red
    Write-Host '  $env:EFINSIGN_API_KEY = "efsk_live_..."'
    exit 1
}
$Auth = "Authorization: Bearer $Key"

Write-Host "[1/3] Listing existing webhooks..." -ForegroundColor Cyan
$list = curl.exe -s -H $Auth "$Base/webhooks" | ConvertFrom-Json
$existing = $list.data
if ($existing) {
    foreach ($wh in $existing) {
        Write-Host ("    Deleting " + $wh.id + " (failure_count=" + $wh.failure_count + ")") -ForegroundColor Yellow
        curl.exe -s -X DELETE -H $Auth "$Base/webhooks/$($wh.id)" | Out-Null
    }
} else {
    Write-Host "    None found."
}

Write-Host "[2/3] Registering one fresh webhook..." -ForegroundColor Cyan
$body = @{
    url    = $ReceiverUrl
    events = @("document.sent","document.completed","document.voided","document.signer_signed","document.signer_declined")
} | ConvertTo-Json -Compress
$bodyPath = Join-Path $env:TEMP "efinsign-webhook-reg.json"
[System.IO.File]::WriteAllText($bodyPath, $body)
$resp = curl.exe -s -X POST "$Base/webhooks" -H $Auth -H "Content-Type: application/json" --data "@$bodyPath"
Write-Host $resp

$secret = ($resp | ConvertFrom-Json).data.secret
Write-Host "[3/3] Result:" -ForegroundColor Cyan
if ($secret) {
    Write-Host ""
    Write-Host "==================== COPY THIS ====================" -ForegroundColor Green
    Write-Host "EFINSIGN_WEBHOOK_SECRET = $secret"
    Write-Host "===================================================" -ForegroundColor Green
    Write-Host "Then run:"
    Write-Host "  supabase secrets set EFINSIGN_WEBHOOK_SECRET=$secret --project-ref boskmqywofwekszhgryb"
} else {
    Write-Host "No secret returned - check the response above." -ForegroundColor Yellow
}
