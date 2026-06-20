# Opens Supabase SQL Editor, copies launch SQL to clipboard, polls verify until applied.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$sqlPath = Join-Path $root "supabase-launch-hardening.sql"

if (-not (Test-Path $sqlPath)) {
  Write-Error "Missing supabase-launch-hardening.sql"
}

Get-Content $sqlPath -Raw | Set-Clipboard
Start-Process "https://supabase.com/dashboard/project/detvapbvkabvdjsdttfy/sql/new"

Write-Host ""
Write-Host "SQL copied to clipboard. In Supabase SQL Editor: Ctrl+V then Run."
Write-Host "Waiting for launch hardening to apply (up to 4 minutes)..."
Write-Host ""

Get-Content (Join-Path $root ".env.local") | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
    $i = $line.IndexOf("=")
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim().Trim('"')
    if ($v) { Set-Item -Path "env:$k" -Value $v }
  }
}

for ($attempt = 1; $attempt -le 24; $attempt++) {
  Start-Sleep -Seconds 10
  Write-Host "Verify attempt $attempt/24 ..."
  node (Join-Path $root "scripts/verify-production-hardening.mjs")
  if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Launch hardening verified - 9/9 PASS."
    exit 0
  }
}

Write-Host ""
Write-Host "Timed out. Paste SQL from supabase-launch-hardening.sql and Run, then run verify script."
exit 1
