# eFinSign API - end-to-end email send test
#
# Usage (PowerShell):
#   $env:EFINSIGN_API_KEY = "efsk_live_...your key..."
#   .\scripts\test-email-send.ps1
#
# Creates a draft document, adds YOU as the signer, sends it, and prints the
# notifications result so you can see whether recipient emails went out.

$ErrorActionPreference = "Stop"

$Base = "https://cavdivfhszrnhliyafze.supabase.co/functions/v1/api"
$Key  = $env:EFINSIGN_API_KEY
$SignerEmail = "egwuonucheojosamuel@gmail.com"   # where the test email is sent
$SignerName  = "Samuel"

if (-not $Key) {
    Write-Host "Set your API key first:" -ForegroundColor Red
    Write-Host '  $env:EFINSIGN_API_KEY = "efsk_live_...your key..."'
    exit 1
}

$AuthHeader = "Authorization: Bearer $Key"

# 1. Make a minimal one-page PDF to upload
$pdfPath = Join-Path $env:TEMP "efinsign-test.pdf"
$pdf = @"
%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>
%%EOF
"@
[System.IO.File]::WriteAllText($pdfPath, $pdf)

Write-Host ""
Write-Host "[1/4] Creating test document..." -ForegroundColor Cyan
$createJson = curl.exe -s -X POST "$Base/documents" `
    -H $AuthHeader `
    -F "title=API Email Test" `
    -F "file=@$pdfPath;type=application/pdf"
Write-Host $createJson
$docId = ($createJson | ConvertFrom-Json).data.id
if (-not $docId) { Write-Host "No document id returned - stopping." -ForegroundColor Red; exit 1 }
Write-Host ("    Document ID: " + $docId) -ForegroundColor Green

Write-Host ""
Write-Host ("[2/4] Adding signer (" + $SignerEmail + ")...") -ForegroundColor Cyan
# Write the JSON body to a file and let curl read it with @file. Passing JSON
# inline via -d mangles the quotes under Windows PowerShell 5.1.
$signerBody = @{ name = $SignerName; email = $SignerEmail; order = 0 } | ConvertTo-Json -Compress
$signerBodyPath = Join-Path $env:TEMP "efinsign-signer.json"
[System.IO.File]::WriteAllText($signerBodyPath, $signerBody)
$signerJson = curl.exe -s -X POST "$Base/documents/$docId/signers" `
    -H $AuthHeader -H "Content-Type: application/json" --data "@$signerBodyPath"
Write-Host $signerJson

Write-Host ""
Write-Host "[3/4] Sending document (this triggers the emails)..." -ForegroundColor Cyan
$sendJson = curl.exe -s -X POST "$Base/documents/$docId/send" -H $AuthHeader
Write-Host $sendJson

Write-Host ""
Write-Host "[4/4] Notification result:" -ForegroundColor Cyan
$notifications = ($sendJson | ConvertFrom-Json).data.notifications
$notifications | ConvertTo-Json

if ($notifications.status -eq "sent") {
    Write-Host ""
    Write-Host ("[OK] Emails accepted by Resend. Check the inbox for " + $SignerEmail + ".") -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host ("[WARN] status = " + $notifications.status + ". Error: " + $notifications.error) -ForegroundColor Yellow
    Write-Host "       Gateway/403 is fixed if you see a Resend error here - likely sender-domain or RESEND_API_KEY config."
}
