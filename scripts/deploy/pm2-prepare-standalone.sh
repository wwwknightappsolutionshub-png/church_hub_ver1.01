#!/usr/bin/env bash
# Optional: use Next standalone output (lighter than full next start).
# Default PM2 setup uses `next start` via ecosystem.config.cjs — skip this unless you switch.
set -euo pipefail

ROOT="${CHURCHHUB_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
WEB="$ROOT/apps/web"
STANDALONE="$WEB/.next/standalone"

cd "$ROOT"
export NEXT_STANDALONE=1
pnpm --filter @church-hub/web build

if [[ ! -f "$STANDALONE/apps/web/server.js" ]]; then
  echo "ERROR: standalone server not found at $STANDALONE/apps/web/server.js" >&2
  exit 1
fi

mkdir -p "$STANDALONE/apps/web/.next"
rsync -a "$WEB/.next/static/" "$STANDALONE/apps/web/.next/static/"
rsync -a "$WEB/public/" "$STANDALONE/apps/web/public/"
echo "Standalone ready: node $STANDALONE/apps/web/server.js (PORT=3003)"
