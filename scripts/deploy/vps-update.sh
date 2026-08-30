#!/usr/bin/env bash
# Production deploy on VPS — PM2 + native Postgres/Redis (no Docker).
#
# Usage:
#   cd /www/wwwroot/church-hub.wazconnect.com
#   ./scripts/deploy/vps-update.sh
#
# Web lifecycle (automatic):
#   - Stops church-hub-web before Next build (safe — avoids stale standalone)
#   - After build, always delete+start church-hub-web (reload skips stopped apps)
#   - Exits non-zero if web health check fails (no silent 502)
#
# Options (env):
#   CHURCHHUB_ROOT   — repo path (default: pwd)
#   GIT_BRANCH       — branch to deploy (default: master)
#   SKIP_GIT=1       — skip git pull
#   FORCE_GIT_RESET=1 — git reset --hard origin/$GIT_BRANCH

set -euo pipefail

export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

ROOT="${CHURCHHUB_ROOT:-$(pwd)}"
cd "$ROOT"
GIT_BRANCH="${GIT_BRANCH:-master}"
ECOSYSTEM="$ROOT/infra/pm2/ecosystem.config.cjs"
WEB_PORT="${WEB_PORT:-3003}"

pm2_app_status() {
  local name="$1"
  pm2 jlist 2>/dev/null | node -e "
    const apps = JSON.parse(require('fs').readFileSync(0, 'utf8'));
    const app = apps.find((a) => a.name === process.argv[1]);
    console.log(app?.pm2_env?.status ?? 'missing');
  " "$name"
}

wait_http_ok() {
  local url="$1" label="$2" i code
  for i in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    code=${code:-000}
    if [[ "$code" =~ ^(200|204|301|302|307|308)$ ]]; then
      echo "$label -> $code"
      return 0
    fi
    sleep 2
  done
  echo "$label -> failed (no 2xx/3xx after 30s, last=$code)" >&2
  return 1
}

deploy_failed() {
  echo "ERROR: $1" >&2
  pm2 list 2>/dev/null | grep -E 'church-hub-(api|web)' || true
  if pm2 describe church-hub-api >/dev/null 2>&1; then
    pm2 logs church-hub-api --lines 20 --nostream 2>/dev/null || true
  fi
  if pm2 describe church-hub-web >/dev/null 2>&1; then
    pm2 logs church-hub-web --lines 30 --nostream 2>/dev/null || true
  fi
  if [[ -f "${STANDALONE:-}/apps/web/server.js" ]]; then
    echo "standalone server.js: present" >&2
  else
    echo "standalone server.js: MISSING" >&2
  fi
  exit 1
}

if [[ ! -f .env ]]; then
  echo "ERROR: .env missing. Copy .env.pm2.example → .env" >&2
  exit 1
fi

mkdir -p logs

if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  echo "==> Git: fetch + deploy $GIT_BRANCH"
  git fetch origin
  if [[ "${FORCE_GIT_RESET:-0}" == "1" ]]; then
    git reset --hard "origin/$GIT_BRANCH"
  else
    git pull --ff-only origin "$GIT_BRANCH"
  fi
fi

# Load KEY=VALUE from .env without `source` (passwords may contain | * $ ` etc.).
load_dotenv() {
  local file="$1" line key val
  [[ -f "$file" ]] || {
    echo "ERROR: $file missing" >&2
    return 1
  }
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*export[[:space:]]+ ]] && line="${line#*export }"
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    key="${line%%=*}"
    val="${line#*=}"
    if [[ "$val" =~ ^\"(.*)\"$ ]]; then
      val="${BASH_REMATCH[1]}"
      val="${val//\\\"/\"}"
    elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
      val="${BASH_REMATCH[1]}"
    fi
    printf -v "$key" '%s' "$val"
    export "$key"
  done <"$file"
}

if ! load_dotenv .env; then
  echo "ERROR: failed to load .env" >&2
  exit 1
fi

export GIT_COMMIT="$(git rev-parse --short HEAD)"
export BUILD_SHA="$GIT_COMMIT"

export SERVER_API_URL="${SERVER_API_URL:-http://127.0.0.1:4000}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export API_PORT="${API_PORT:-4000}"

echo "==> Church Hub PM2 deploy @ $ROOT"
echo "==> Commit $GIT_COMMIT"
corepack enable 2>/dev/null || true
corepack prepare pnpm@9.14.2 --activate 2>/dev/null || true

echo "==> pnpm install"
pnpm install --frozen-lockfile --prod=false

echo "==> Build shared-types + API"
export NODE_ENV=production
pnpm --filter @church-hub/shared-types build
pnpm --filter @church-hub/api exec prisma generate
pnpm --filter @church-hub/api build

echo "==> Stop web before Next build (PM2 reload does not restart stopped apps)"
if pm2 describe church-hub-web >/dev/null 2>&1; then
  pm2 stop church-hub-web 2>/dev/null || true
fi

echo "==> Build web (NEXT_PUBLIC_* from .env)"
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

# opengraph-image / twitter-image routes require sharp in standalone output
if ! (cd "$STANDALONE" && node -e "require('sharp')" 2>/dev/null); then
  echo "==> Installing sharp into standalone bundle"
  (cd "$STANDALONE" && npm install sharp@0.33.5 --omit=dev --no-package-lock --no-save) || {
    echo "ERROR: sharp install failed — OG image routes will crash web" >&2
    exit 1
  }
fi
if ! (cd "$STANDALONE" && node -e "require('sharp')" 2>/dev/null); then
  deploy_failed "sharp missing in standalone after install — aborting deploy"
fi
LOGIN_CHUNK_FILE=$(find "$STANDALONE/apps/web/.next/static/chunks/app/login" -name 'page-*.js' 2>/dev/null | head -1 || true)
if [[ -z "$LOGIN_CHUNK_FILE" ]]; then
  echo "WARN: login page chunk missing under standalone .next/static" >&2
else
  echo "Login chunk present: $(basename "$LOGIN_CHUNK_FILE")"
fi

echo "==> Database migrations"
cd apps/api
if ! npx prisma migrate deploy; then
  echo "WARN: prisma migrate deploy failed — check DATABASE_URL and permissions." >&2
fi
cd "$ROOT"

export CHURCHHUB_ROOT="$ROOT"

if [[ "$(pm2_app_status church-hub-api)" == "online" ]]; then
  echo "==> PM2 reload API"
  pm2 reload "$ECOSYSTEM" --only church-hub-api --update-env
elif pm2 describe church-hub-api >/dev/null 2>&1; then
  echo "==> PM2 start API (was stopped/errored)"
  pm2 start "$ECOSYSTEM" --only church-hub-api --update-env
else
  echo "==> PM2 start API (first run)"
  pm2 start "$ECOSYSTEM" --only church-hub-api --update-env
fi

echo "==> PM2 restart web (always after successful standalone build)"
pm2 delete church-hub-web 2>/dev/null || true
pm2 start "$ECOSYSTEM" --only church-hub-web --update-env

pm2 save

echo "==> Verify (local)"
if ! wait_http_ok "http://127.0.0.1:${API_PORT}/api/v1/health" "api health"; then
  deploy_failed "church-hub-api not responding on :${API_PORT}/api/v1/health"
fi

if ! wait_http_ok "http://127.0.0.1:${WEB_PORT}/login" "web /login"; then
  deploy_failed "church-hub-web not responding on :${WEB_PORT} — deploy aborted (fix before nginx serves 502)"
fi

if ! wait_http_ok "http://127.0.0.1:${WEB_PORT}/images/auth-side-visual.svg" "auth image"; then
  deploy_failed "web static assets not reachable on :${WEB_PORT}"
fi

echo "Deployed $GIT_COMMIT under PM2. Nginx: / -> ${WEB_PORT}, /api/ -> ${API_PORT}"
