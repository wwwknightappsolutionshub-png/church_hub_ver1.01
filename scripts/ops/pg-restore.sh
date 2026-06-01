#!/usr/bin/env bash
# Restore Church Hub from pg_dump gzip. Usage: ./pg-restore.sh backups/churchhub-....sql.gz
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

FILE="$1"
if [ ! -f "$FILE" ]; then
  echo "File not found: $FILE" >&2
  exit 1
fi

echo "Restoring $FILE into target database (destructive)."
read -r -p "Type RESTORE to continue: " CONFIRM
if [ "$CONFIRM" != "RESTORE" ]; then
  echo "Aborted."
  exit 1
fi

gunzip -c "$FILE" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
echo "Restore complete. Run: pnpm --filter @church-hub/api exec prisma migrate deploy"
