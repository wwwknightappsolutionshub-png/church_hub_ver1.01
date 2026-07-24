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
curl -sf -o /dev/null -w "GET /opengraph-image -> %{http_code}\n" \
  "$PUBLIC_BASE/opengraph-image" || echo "WARN: /opengraph-image not reachable"
curl -s -o /dev/null -w "GET /images/og-image.png -> %{http_code}\n" \
  "$PUBLIC_BASE/images/og-image.png" || true
curl -sf -o /dev/null -w "GET /c/demo-church -> %{http_code}\n" "$PUBLIC_BASE/c/demo-church"

HTML_PUBLIC="$(curl -sf "$PUBLIC_BASE/login" | head -c 20000)"
HTML_LOCAL="$(curl -sf "$LOCAL_WEB/login" | head -c 20000)"

if echo "$HTML_PUBLIC" | grep -qiE 'Magic login|Shared password for all test'; then
  echo "WARN: public login HTML mentions demo credentials (stale proxy cache or old build)"
fi
if echo "$HTML_LOCAL" | grep -qiE 'Magic login|Shared password for all test'; then
  echo "WARN: local login HTML mentions demo credentials"
fi
echo "OK: checked public + local login HTML shells"

CHUNK_PUBLIC="$(echo "$HTML_PUBLIC" | sed -n 's/.*\(app\/login\/page-[a-f0-9]*\.js\).*/\1/p' | head -1)"
CHUNK_LOCAL="$(echo "$HTML_LOCAL" | sed -n 's/.*\(app\/login\/page-[a-f0-9]*\.js\).*/\1/p' | head -1)"

if [[ -n "$CHUNK_LOCAL" ]]; then
  echo "Login chunk (PM2): $CHUNK_LOCAL"
  LOCAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$LOCAL_WEB/_next/static/chunks/$CHUNK_LOCAL" || true)
  echo "  local static -> ${LOCAL_CODE:-000}"
  if [[ "$LOCAL_CODE" != "200" ]]; then
    echo "FAIL: PM2 is not serving the current login JS — run ./scripts/deploy/vps-update.sh" >&2
    exit 1
  fi
  CHUNK_BODY=$(curl -sf "$LOCAL_WEB/_next/static/chunks/$CHUNK_LOCAL" | head -c 50000 || true)
  if echo "$CHUNK_BODY" | grep -qiE 'Magic login|FALLBACK_TEST|Shared password for all test'; then
    echo "WARN: login JS still contains Magic login — rebuild web"
  else
    echo "OK: current login JS has no Magic login UI"
  fi
fi

if [[ -n "$CHUNK_PUBLIC" && "$CHUNK_PUBLIC" != "$CHUNK_LOCAL" ]]; then
  echo "WARN: public login HTML references stale chunk $CHUNK_PUBLIC (live: $CHUNK_LOCAL)"
  echo "      Purge Nginx/proxy cache for /login or ensure location / has Cache-Control: no-store"
  PUB_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_BASE/_next/static/chunks/$CHUNK_PUBLIC" || true)
  echo "      stale public chunk -> ${PUB_CODE:-000}"
elif [[ -n "$CHUNK_PUBLIC" ]]; then
  PUB_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PUBLIC_BASE/_next/static/chunks/$CHUNK_PUBLIC" || true)
  echo "Login chunk (public): $CHUNK_PUBLIC -> ${PUB_CODE:-000}"
fi

echo ""
echo "==> Local PM2"
curl -sf "$LOCAL_API/api/v1/health" && echo ""
curl -sf -o /dev/null -w "local web /login -> %{http_code}\n" "$LOCAL_WEB/login"
curl -sf -o /dev/null -w "local auth image -> %{http_code}\n" "$LOCAL_WEB/images/auth-side-visual.svg"

if command -v git >/dev/null 2>&1; then
  echo ""
  echo "Git on server: $(git -C "${CHURCHHUB_ROOT:-.}" rev-parse --short HEAD 2>/dev/null || echo 'n/a')"
fi

echo "Done."
