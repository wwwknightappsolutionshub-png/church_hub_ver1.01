#!/usr/bin/env bash
# Build and reload Church Hub under PM2 (native Postgres/Redis on the host).
#
# Usage:
#   cd /www/wwwroot/church-hub.wazconnect.com
#   ./scripts/deploy/pm2-update.sh
#   # If "Permission denied": bash scripts/deploy/pm2-update.sh
#   # (git tracks +x on scripts/deploy/*.sh — pull preserves execute bit)
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

# Install all deps (incl. typescript) without forcing NODE_ENV=development — that breaks `next build`
echo "==> pnpm install"
pnpm install --frozen-lockfile --prod=false

echo "==> Build shared-types + API (production)"
export NODE_ENV=production
pnpm --filter @church-hub/shared-types build
pnpm --filter @church-hub/api exec prisma generate
pnpm --filter @church-hub/api build

echo "==> Build web (NEXT_PUBLIC_* from .env, standalone output)"
pnpm --filter @church-hub/web build
WEB="$ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"
if [[ ! -f "$STANDALONE/apps/web/server.js" ]]; then
  echo "ERROR: standalone server missing at $STANDALONE/apps/web/server.js" >&2
  exit 1
fi
mkdir -p "$STANDALONE/apps/web/.next"
rsync -a "$WEB/.next/static/" "$STANDALONE/apps/web/.next/static/"
rsync -a "$WEB/public/" "$STANDALONE/apps/web/public/"
LOGIN_CHUNK_FILE=$(find "$STANDALONE/apps/web/.next/static/chunks/app/login" -name 'page-*.js' 2>/dev/null | head -1 || true)
if [[ -z "$LOGIN_CHUNK_FILE" ]]; then
  echo "WARN: login page chunk missing under standalone .next/static — web UI may break" >&2
else
  echo "Login chunk present: $(basename "$LOGIN_CHUNK_FILE")"
fi
echo "Standalone web bundle ready"

echo "==> Migrations"
cd apps/api
if ! npx prisma migrate deploy; then
  echo "WARN: prisma migrate deploy failed — PM2 will still reload (fix DB permissions if needed)." >&2
fi
cd "$ROOT"

export CHURCHHUB_ROOT="$ROOT"

# PM2 child processes inherit exported vars from .env
if pm2 describe church-hub-api >/dev/null 2>&1; then
  echo "==> PM2 reload"
  pm2 reload "$ROOT/infra/pm2/ecosystem.config.cjs" --update-env
else
  echo "==> PM2 start (loads current shell env from .env)"
  pm2 start "$ROOT/infra/pm2/ecosystem.config.cjs" --update-env
fi

pm2 save

echo "==> Verify (wait for PM2 processes to listen)"
wait_http() {
  local url="$1" label="$2" i code
  for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    if [[ "$code" != "000" && "$code" != "" ]]; then
      echo "$label -> $code"
      return 0
    fi
    sleep 2
  done
  echo "$label -> failed (no response after 30s)" >&2
  return 1
}

set +e
curl -sf "http://127.0.0.1:${API_PORT}/api/v1/health" && echo ""
API_OK=$?
wait_http "http://127.0.0.1:3003/login" "web /login"
WEB_OK=$?
wait_http "http://127.0.0.1:3003/images/auth-side-visual.svg" "auth image"
set -e

if [[ "$WEB_OK" -ne 0 ]]; then
  echo "WARN: web check failed — recent logs:" >&2
  pm2 logs church-hub-web --lines 25 --nostream 2>/dev/null || true
fi

echo "Deployed $GIT_COMMIT under PM2. Nginx: / -> 3003, /api/ -> ${API_PORT}"
