# Phase 10 — Testing & hardening runner (Windows)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "../..")
Set-Location $root

Write-Host "=== Phase 10: Unit tests (API) ===" -ForegroundColor Cyan
Push-Location apps/api
pnpm exec jest --passWithNoTests
if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }

Write-Host "`n=== Phase 10: Integration / E2E (API, requires DATABASE_URL) ===" -ForegroundColor Cyan
pnpm exec jest --config test/jest-e2e.json --runInBand --forceExit --testPathPattern=phase10
Pop-Location

Write-Host "`n=== Phase 10: Web unit tests (Vitest) ===" -ForegroundColor Cyan
Push-Location apps/web
pnpm test
Pop-Location

Write-Host "`n=== Phase 10: PWA static audit ===" -ForegroundColor Cyan
node scripts/membership-phase10/pwa-audit.mjs

Write-Host "`n=== Phase 10: Security static audit ===" -ForegroundColor Cyan
node scripts/membership-phase10/security-audit.mjs

Write-Host "`n=== Phase 10: Playwright (optional — start web:3001 + api:4000) ===" -ForegroundColor Cyan
Write-Host "  pnpm --filter @church-hub/web test:e2e -- e2e/membership-*.spec.ts"

Write-Host "`nPhase 10 runner finished." -ForegroundColor Green
