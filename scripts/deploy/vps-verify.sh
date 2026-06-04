#!/usr/bin/env bash
# Quick checks that production is serving the expected build (run on VPS or via curl).
set -euo pipefail

PUBLIC_BASE="${PUBLIC_BASE:-https://church-hub.wazconnect.com}"
LOCAL_WEB="${LOCAL_WEB:-http://127.0.0.1:3003}"
LOCAL_API="${LOCAL_API:-http://127.0.0.1:4000}"

echo "==> Public: $PUBLIC_BASE"
HEALTH=$(curl -sf "$PUBLIC_BASE/api/v1/health" || true)
echo "$HEALTH"
if echo "$HEALTH" | grep -q '"build"'; then
  echo "API build: $(echo "$HEALTH" | sed -n 's/.*"build":"\([^"]*\)".*/\1/p')"
fi
curl -sf -o /dev/null -w "GET /login -> %{http_code}\n" "$PUBLIC_BASE/login"
curl -sf -o /dev/null -w "GET /images/auth-side-visual.svg -> %{http_code}\n" \
  "$PUBLIC_BASE/images/auth-side-visual.svg"
curl -sf -o /dev/null -w "GET /c/demo-church -> %{http_code}\n" "$PUBLIC_BASE/c/demo-church"

HTML="$(curl -sf "$PUBLIC_BASE/login" | head -c 12000)"
if echo "$HTML" | grep -qiE 'Magic login|admin@demo\.church|ChurchHub123'; then
  echo "WARN: login HTML still shows demo/test credentials (stale web build or browser cache)"
else
  echo "OK: no demo credentials in login HTML shell"
fi

LOGIN_CHUNK="$(echo "$HTML" | sed -n 's/.*\(app\/login\/page-[a-f0-9]*\.js\).*/\1/p' | head -1)"
if [[ -n "$LOGIN_CHUNK" ]]; then
  CHUNK_URL="$PUBLIC_BASE/_next/static/chunks/$LOGIN_CHUNK"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$CHUNK_URL" || true)
  echo "Login chunk /_next/static/chunks/$LOGIN_CHUNK -> ${CODE:-000}"
  LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL_WEB/_next/static/chunks/$LOGIN_CHUNK" || true)
  echo "Local login chunk -> ${LOCAL_CODE:-000}"
  if [[ "$CODE" != "200" ]]; then
    echo "FAIL: public login JS chunk not served — check Nginx location ^~ /_next/ and run pm2-update.sh" >&2
    exit 1
  fi
  CHUNK_BODY=$(curl -sf "$CHUNK_URL" | head -c 50000 || true)
  if echo "$CHUNK_BODY" | grep -qiE 'Magic login|admin@demo\.church|FALLBACK_TEST'; then
    echo "WARN: login JS chunk still contains Magic login — hard-refresh browser / unregister service worker"
  else
    echo "OK: login JS chunk has no Magic login UI"
  fi
fi

echo ""
echo "==> Local containers"
curl -sf "$LOCAL_API/api/v1/health" && echo ""
curl -sf -o /dev/null -w "local web /login -> %{http_code}\n" "$LOCAL_WEB/login"
curl -sf -o /dev/null -w "local auth image -> %{http_code}\n" "$LOCAL_WEB/images/auth-side-visual.svg"

if command -v git >/dev/null 2>&1; then
  echo ""
  echo "Git on server: $(git -C "${CHURCHHUB_ROOT:-.}" rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
fi

echo "Done."
