#!/usr/bin/env bash
# Compare local PM2 login HTML vs public URL (detects Nginx HTML cache).
set -euo pipefail

PUBLIC_BASE="${PUBLIC_BASE:-https://church-hub.wazconnect.com}"
LOCAL_WEB="${LOCAL_WEB:-http://127.0.0.1:3003}"
ROOT="${CHURCHHUB_ROOT:-/www/wwwroot/church-hub.wazconnect.com}"

echo "==> Login HTML chunk references"
PUB=$(curl -s "$PUBLIC_BASE/login" | grep -o 'app/login/page-[a-f0-9]*\.js' | head -1 || true)
LOC=$(curl -s "$LOCAL_WEB/login" | grep -o 'app/login/page-[a-f0-9]*\.js' | head -1 || true)
echo "  public: ${PUB:-MISSING}"
echo "  local:  ${LOC:-MISSING}"

if [[ -n "$PUB" && -n "$LOC" && "$PUB" != "$LOC" ]]; then
  echo ""
  echo "MISMATCH: Nginx or a CDN is serving stale /login HTML."
  echo "Fix: in aaPanel site config, disable proxy_cache for / and add:"
  echo "  add_header Cache-Control \"no-store, no-cache, must-revalidate\" always;"
  echo "See: infra/nginx/church-hub.wazconnect.com.conf.example"
fi

if [[ -n "$LOC" ]]; then
  ON_DISK="$ROOT/apps/web/.next/standalone/apps/web/.next/static/chunks/$LOC"
  if [[ -f "$ON_DISK" ]]; then
    echo "  disk:   OK ($ON_DISK)"
  else
    echo "  disk:   MISSING $ON_DISK — run ./scripts/deploy/pm2-update.sh"
  fi
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL_WEB/_next/static/chunks/$LOC" || true)
  echo "  local chunk HTTP: ${CODE:-000}"
fi

if [[ -n "$PUB" ]]; then
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_BASE/_next/static/chunks/$PUB" || true)
  echo "  public chunk HTTP: ${CODE:-000}"
fi

echo ""
echo "==> Response headers (public /login)"
curl -sI "$PUBLIC_BASE/login" | grep -iE 'cache-control|etag|age|x-cache' || true
