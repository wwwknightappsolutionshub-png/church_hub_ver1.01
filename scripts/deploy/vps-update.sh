#!/usr/bin/env bash
# Fresh production deploy on VPS — avoids stale Docker images, containers, and HTML cache.
#
# Usage (on the server):
#   cd /www/wwwroot/church-hub.wazconnect.com
#   chmod +x scripts/deploy/vps-update.sh
#   ./scripts/deploy/vps-update.sh
#
# Options (env):
#   CHURCHHUB_ROOT   — repo path (default: pwd)
#   GIT_BRANCH       — branch to deploy (default: master)
#   SKIP_GIT=1       — skip git pull
#   FORCE_GIT_RESET=1 — git reset --hard origin/$GIT_BRANCH (discards server-local edits)
#   NO_CACHE=1       — docker build --no-cache (default: 1)
#   PRUNE_IMAGES=1   — remove dangling images after deploy (default: 1)
#   SERVICES         — space-separated services to rebuild (default: api web)

set -euo pipefail

ROOT_DIR="${CHURCHHUB_ROOT:-$(pwd)}"
cd "$ROOT_DIR"

GIT_BRANCH="${GIT_BRANCH:-master}"
NO_CACHE="${NO_CACHE:-1}"
PRUNE_IMAGES="${PRUNE_IMAGES:-1}"
SERVICES="${SERVICES:-api web}"

COMPOSE=(docker compose
  -f docker-compose.yml
  -f infra/docker/docker-compose.prod.yml
  -f infra/docker/docker-compose.aapanel.yml
  --env-file .env
)

if [[ ! -f .env ]]; then
  echo "ERROR: .env not found in $ROOT_DIR" >&2
  exit 1
fi

echo "==> Church Hub deploy @ $ROOT_DIR"

if [[ "${SKIP_GIT:-0}" != "1" ]]; then
  echo "==> Git: fetch + deploy $GIT_BRANCH"
  git fetch origin
  if [[ "${FORCE_GIT_RESET:-0}" == "1" ]]; then
    git reset --hard "origin/$GIT_BRANCH"
  else
    git pull --ff-only origin "$GIT_BRANCH"
  fi
fi

export GIT_COMMIT
GIT_COMMIT="$(git rev-parse --short HEAD)"
export BUILD_SHA="$GIT_COMMIT"
export BUILD_DATE="$(date -u +%Y%m%dT%H%M%SZ)"
echo "==> Building commit $GIT_COMMIT ($BUILD_DATE)"

BUILD_ARGS=()
if [[ "$NO_CACHE" == "1" ]]; then
  BUILD_ARGS+=(--no-cache)
fi
BUILD_ARGS+=(--pull)

"${COMPOSE[@]}" build "${BUILD_ARGS[@]}" \
  --build-arg BUILD_SHA="$BUILD_SHA" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-$(grep -E '^NEXT_PUBLIC_API_URL=' .env | cut -d= -f2- || true)}" \
  --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-$(grep -E '^NEXT_PUBLIC_APP_URL=' .env | cut -d= -f2- || true)}" \
  --build-arg NEXT_PUBLIC_DEMO_MODE="${NEXT_PUBLIC_DEMO_MODE:-false}" \
  $SERVICES

echo "==> Recreate containers (force new images)"
"${COMPOSE[@]}" up -d --force-recreate --remove-orphans $SERVICES

echo "==> Database migrations"
"${COMPOSE[@]}" exec -T api npx prisma migrate deploy

if [[ "$PRUNE_IMAGES" == "1" ]]; then
  echo "==> Prune dangling Docker images"
  docker image prune -f >/dev/null || true
fi

echo "==> Verify (local)"
set +e
curl -sf http://127.0.0.1:4000/api/v1/health | head -c 200
echo ""
curl -sf -o /dev/null -w "web /login HTTP %{http_code}\n" http://127.0.0.1:3003/login
curl -sf -o /dev/null -w "auth image HTTP %{http_code}\n" http://127.0.0.1:3003/images/auth-side-visual.svg
set -e

echo ""
echo "Deployed commit: $GIT_COMMIT"
echo "Reload Nginx in aaPanel if you changed infra/nginx/*.example"
echo "Hard-refresh browser: Ctrl+Shift+R (or clear site data for church-hub.wazconnect.com)"
