#!/usr/bin/env bash
# Backward-compatible alias — use vps-update.sh (PM2, no Docker).
exec "$(dirname "$0")/vps-update.sh" "$@"
