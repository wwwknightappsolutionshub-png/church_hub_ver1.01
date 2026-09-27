#!/usr/bin/env bash
# Logical Postgres backup for Church Hub (emergency CLI).
# Prefer the in-app hybrid backup worker for production schedules.
# Connection string is passed via PG* env vars (not argv).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# Parse URL into PG* without putting credentials on argv
eval "$(node -e '
const u = new URL(process.env.DATABASE_URL.replace(/^postgres:/, "postgresql:"));
const db = decodeURIComponent(u.pathname.replace(/^\//, "").split("/")[0] || "");
const q = (s) => JSON.stringify(s);
console.log("export PGHOST=" + q(u.hostname || "localhost"));
console.log("export PGPORT=" + q(u.port || "5432"));
console.log("export PGUSER=" + q(decodeURIComponent(u.username || "")));
console.log("export PGPASSWORD=" + q(decodeURIComponent(u.password || "")));
console.log("export PGDATABASE=" + q(db));
console.log("export PGSSLMODE=" + q(u.searchParams.get("sslmode") || "prefer"));
')"

STAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/churchhub-$STAMP.sql.gz"

echo "Backing up to $OUT"
pg_dump --no-owner --no-acl | gzip -9 > "$OUT"
chmod 600 "$OUT" 2>/dev/null || true
echo "Done: $(du -h "$OUT" | cut -f1)"
echo "Tip: encrypt with the in-app worker (BACKUP_ENCRYPTION_KEY) or openssl for long-term storage."
