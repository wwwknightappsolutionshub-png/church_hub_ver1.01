#!/usr/bin/env bash
# Build and reload Church Hub under PM2 (native Postgres/Redis on the host).
#
# Usage:
#   cd /www/wwwroot/church-hub.wazconnect.com
#   chmod +x scripts/deploy/pm2-update.sh
#   ./scripts/deploy/pm2-update.sh
#
# Env:
#   CHURCHHUB_ROOT, GIT_BRANCH, SKIP_GIT=1, FORCE_GIT_RESET=1

set -euo pipefail

# Non-interactive Corepack / pnpm on VPS
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

ROOT="${CHURCHHUB_ROOT:-$(pwd)}"
cd "$ROOT"
GIT_BRANCH="${GIT_BRANCH:-master}"

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy .env.pm2.example → .env" >&2
  exit 1
fi

mkdir -p logs

if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  git fetch origin
  if [[ "${FORCE_GIT_RESET:-0}" == "1" ]]; then
    git reset --hard "origin/$GIT_BRANCH"
  else
    git pull --ff-only origin "$GIT_BRANCH"
  fi
fi

# Load .env (secrets, URLs). Empty GIT_COMMIT/BUILD_SHA in .env must not win over git.
set -a
# shellcheck disable=SC1091
source .env
set +a

export GIT_COMMIT="$(git rev-parse --short HEAD)"
export BUILD_SHA="$GIT_COMMIT"

# PM2: API on localhost; SSR must not use Docker hostname "api"
export SERVER_API_URL="${SERVER_API_URL:-http://127.0.0.1:4000}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export API_PORT="${API_PORT:-4000}"

echo "==> Deploy commit $GIT_COMMIT (PM2)"
echo "==> Enable pnpm via corepack"
corepack enable 2>/dev/null || true
corepack prepare pnpm@9.14.2 --activate 2>/dev/null || true

# .env sets NODE_ENV=production — devDependencies (typescript, nest CLI) are required to build
echo "==> pnpm install (including devDependencies for build)"
export NODE_ENV=development
pnpm install --frozen-lockfile

echo "==> Build shared-types + API"
pnpm --filter @church-hub/shared-types build
pnpm --filter @church-hub/api exec prisma generate
pnpm --filter @church-hub/api build

echo "==> Build web (NEXT_PUBLIC_* from .env)"
# Full next start (not standalone) — matches ecosystem.config.cjs
export NEXT_STANDALONE=0
pnpm --filter @church-hub/web build

echo "==> Migrations"
cd apps/api
npx prisma migrate deploy
cd "$ROOT"

export CHURCHHUB_ROOT="$ROOT"
export NODE_ENV=production

# PM2 child processes inherit exported vars from .env
if pm2 describe church-hub-api >/dev/null 2>&1; then
  echo "==> PM2 reload"
  pm2 reload "$ROOT/infra/pm2/ecosystem.config.cjs" --update-env
else
  echo "==> PM2 start (loads current shell env from .env)"
  pm2 start "$ROOT/infra/pm2/ecosystem.config.cjs" --update-env
fi

pm2 save

echo "==> Verify"
curl -sf "http://127.0.0.1:${API_PORT}/api/v1/health" && echo ""
curl -sf -o /dev/null -w "web /login -> %{http_code}\n" "http://127.0.0.1:3003/login"
curl -sf -o /dev/null -w "auth image -> %{http_code}\n" "http://127.0.0.1:3003/images/auth-side-visual.svg"

echo "Deployed $GIT_COMMIT under PM2. Nginx: / -> 3003, /api/ -> ${API_PORT}"
