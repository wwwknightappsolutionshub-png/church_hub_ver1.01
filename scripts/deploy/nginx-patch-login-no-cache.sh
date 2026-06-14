#!/usr/bin/env bash
# Patch aaPanel Nginx so /login and /register HTML are never cached.
# PM2 proxy rules live in extension/church-hub.wazconnect.com/churchhub-docker.conf (not the main vhost).
set -euo pipefail

CONF="${NGINX_CONF:-}"
if [[ -z "$CONF" ]]; then
  for candidate in \
    /www/server/panel/vhost/nginx/extension/church-hub.wazconnect.com/churchhub-docker.conf \
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
  echo "ERROR: Nginx config not found. Set NGINX_CONF=/path/to/churchhub-docker.conf" >&2
  exit 1
fi

echo "==> Using: $CONF"

LOGIN_BLOCK='location = /login {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache off;
    proxy_no_cache 1;
    proxy_cache_bypass 1;
    proxy_ignore_headers Cache-Control Expires X-Accel-Expires;
    proxy_hide_header Cache-Control;
    proxy_hide_header Expires;
    proxy_hide_header Surrogate-Control;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
    add_header Pragma "no-cache" always;
}

'

REGISTER_BLOCK='location = /register {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache off;
    proxy_no_cache 1;
    proxy_cache_bypass 1;
    proxy_ignore_headers Cache-Control Expires X-Accel-Expires;
    proxy_hide_header Cache-Control;
    proxy_hide_header Expires;
    proxy_hide_header Surrogate-Control;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate" always;
    add_header Pragma "no-cache" always;
}

'

CACHE_DIRECTIVES='    proxy_ignore_headers Cache-Control Expires X-Accel-Expires;
    proxy_hide_header Cache-Control;
    proxy_hide_header Expires;
    proxy_hide_header Surrogate-Control;
'

# 0 = modified, 1 = missing location, 2 = already up to date
upgrade_auth_location() {
  local path="$1"
  local loc="location = /$path"
  if ! grep -qF "$loc" "$CONF"; then
    return 1
  fi
  if grep -A30 "$loc" "$CONF" | grep -q 'proxy_hide_header Cache-Control'; then
    return 2
  fi
  echo "==> Upgrading $loc (inject cache-bypass directives)"
  local tmp="${CONF}.tmp"
  awk -v loc="$loc" -v inject="$CACHE_DIRECTIVES" '
    $0 ~ loc && /\{/ && !done {
      print
      print inject
      done = 1
      next
    }
    { print }
  ' "$CONF" > "$tmp"
  mv "$tmp" "$CONF"
  return 0
}

backup_if_needed() {
  BACKUP="${CONF}.bak-$(date +%Y%m%d%H%M%S)"
  cp "$CONF" "$BACKUP"
  echo "==> Backup: $BACKUP"
}

mark_changed() {
  if [[ -z "${BACKUP:-}" ]]; then
    backup_if_needed
  fi
}

need_login=0
need_register=0

upgrade_auth_location login
case $? in
  0) mark_changed ;;
  1) need_login=1 ;;
esac

upgrade_auth_location register
case $? in
  0) mark_changed ;;
  1) need_register=1 ;;
esac

if [[ "$need_login" -eq 1 || "$need_register" -eq 1 ]]; then
  mark_changed
  INSERT=""
  [[ "$need_login" -eq 1 ]] && INSERT+="$LOGIN_BLOCK"
  [[ "$need_register" -eq 1 ]] && INSERT+="$REGISTER_BLOCK"
  awk -v block="$INSERT" '
    /^[[:space:]]*location[[:space:]]+\/[[:space:]]*\{/ && !done {
      print block
      done = 1
    }
    { print }
  ' "$CONF" > "${CONF}.tmp"
  mv "${CONF}.tmp" "$CONF"
  echo "==> Inserted auth location block(s) before location /"
fi

if grep -q 'proxy_hide_header Cache-Control' "$CONF"; then
  echo "==> Auth locations have cache-bypass directives"
fi

echo "==> Test and reload Nginx"
nginx -t
nginx -s reload
echo "==> Done. Verify:"
echo "  curl -sI https://church-hub.wazconnect.com/login | grep -iE 'cache-control|pragma'"
