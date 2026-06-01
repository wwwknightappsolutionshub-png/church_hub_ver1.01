# Comprehensive Church Hub test run (Windows PowerShell)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:DATABASE_URL) {
  $apiEnv = Join-Path $root "apps\api\.env"
  if (Test-Path $apiEnv) {
    Get-Content $apiEnv | ForEach-Object {
      if ($_ -match '^\s*DATABASE_URL=(.+)$') { $env:DATABASE_URL = $matches[1].Trim() }
    }
  }
  if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://postgres@localhost:5432/churchhub?schema=public"
  }
}
if (-not $env:JWT_ACCESS_SECRET) {
  $env:JWT_ACCESS_SECRET = "test-access-secret-min-32-characters-long"
}
if (-not $env:JWT_REFRESH_SECRET) {
  $env:JWT_REFRESH_SECRET = "test-refresh-secret-min-32-characters-long"
}
$env:REDIS_ENABLED = "false"

Write-Host "==> API unit tests"
pnpm --filter @church-hub/api test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Web unit tests"
pnpm --filter @church-hub/web test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Prisma migrate + seed (for E2E)"
pnpm --filter @church-hub/api exec prisma migrate deploy
pnpm --filter @church-hub/api prisma:seed

Write-Host "==> API E2E + integration"
pnpm --filter @church-hub/api test:e2e
exit $LASTEXITCODE
