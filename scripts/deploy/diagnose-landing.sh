#!/usr/bin/env bash
# Diagnose public church landing 404 (run on VPS).
set -euo pipefail

SLUG="${1:-demo-church}"
API="${LOCAL_API:-http://127.0.0.1:4000}"
WEB="${LOCAL_WEB:-http://127.0.0.1:3003}"

echo "==> API: GET /api/v1/churches/${SLUG}/landing"
HTTP=$(curl -sS -o /tmp/ch-landing-body.json -w "%{http_code}" \
  "${API}/api/v1/churches/${SLUG}/landing" || echo "000")
echo "    HTTP $HTTP"
if [[ -f /tmp/ch-landing-body.json ]]; then
  head -c 400 /tmp/ch-landing-body.json
  echo ""
fi

echo ""
echo "==> Web SSR: GET /c/${SLUG}"
curl -sS -o /dev/null -w "    HTTP %{http_code}\n" "${WEB}/c/${SLUG}" || echo "    failed"

echo ""
echo "==> PM2 web env (SERVER_API_URL)"
pm2 env church-hub-web 2>/dev/null | grep -E 'SERVER_API_URL|NEXT_PUBLIC_API_URL' || true
