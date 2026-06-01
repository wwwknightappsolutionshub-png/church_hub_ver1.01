#!/usr/bin/env bash
# Logical Postgres backup for Church Hub (includes all devotional_* tables).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/churchhub-$STAMP.sql.gz"

echo "Backing up to $OUT"
pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip -9 > "$OUT"
echo "Done: $(du -h "$OUT" | cut -f1)"
