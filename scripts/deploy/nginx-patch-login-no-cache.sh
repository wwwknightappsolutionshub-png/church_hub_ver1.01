#!/usr/bin/env bash
# Patch aaPanel Nginx vhost so /login HTML is never cached (fixes stale JS chunk hashes).
set -euo pipefail

CONF="${NGINX_CONF:-}"
if [[ -z "$CONF" ]]; then
  for candidate in \
    /www/server/panel/vhost/nginx/church-hub.wazconnect.com.conf \
    /www/server/panel/vhost/nginx/church-hub.wazconnect.com.conf \
    /etc/nginx/sites-enabled/church-hub.wazconnect.com \
    /etc/nginx/conf.d/church-hub.wazconnect.com.conf; do
    if [[ -f "$candidate" ]]; then
      CONF="$candidate"
      break
    fi
  done
fi

if [[ -z "$CONF" || ! -f "$CONF" ]]; then
  echo "ERROR: Nginx vhost not found. Set NGINX_CONF=/path/to/site.conf" >&2
  echo "Try: ls /www/server/panel/vhost/nginx/" >&2
  exit 1
fi

echo "==> Using: $CONF"

if grep -q 'location = /login' "$CONF"; then
  echo "==> location = /login already present — nothing to add"
else
  BACKUP="${CONF}.bak-$(date +%Y%m%d%H%M%S)"
  cp "$CONF" "$BACKUP"
  echo "==> Backup: $BACKUP"

  BLOCK='    location = /login {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache off;
        proxy_no_cache 1;
        proxy_cache_bypass 1;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, no-cache, must-revalidate" always;
        add_header Pragma "no-cache" always;
    }

'

  awk -v block="$BLOCK" '
    /^[[:space:]]*location[[:space:]]+\// && !done {
      print block
      done = 1
    }
    { print }
  ' "$CONF" > "${CONF}.tmp"
  mv "${CONF}.tmp" "$CONF"
  echo "==> Inserted location = /login before first location / block"
fi

echo "==> Test and reload Nginx"
nginx -t
nginx -s reload
echo "==> Done. Verify:"
echo "  curl -sI https://church-hub.wazconnect.com/login | grep -i cache-control"
