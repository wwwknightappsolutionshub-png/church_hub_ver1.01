# Phase 11 — Production polishing verification
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "../..")
Set-Location $root

Write-Host "=== Phase 11: Deployment readiness ===" -ForegroundColor Cyan
node scripts/membership-phase11/deployment-readiness.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n=== Phase 11: Web unit tests ===" -ForegroundColor Cyan
Push-Location apps/web
pnpm test
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
Pop-Location

Write-Host "`n=== Phase 11: PWA audit ===" -ForegroundColor Cyan
node scripts/membership-phase10/pwa-audit.mjs

Write-Host "`n=== Phase 11: Web production build (bundle check) ===" -ForegroundColor Cyan
Push-Location apps/web
pnpm build
Pop-Location

Write-Host "`nPhase 11 runner finished." -ForegroundColor Green
