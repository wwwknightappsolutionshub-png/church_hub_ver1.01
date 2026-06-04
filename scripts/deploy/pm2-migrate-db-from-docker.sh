#!/usr/bin/env bash
# One-time: copy Church Hub Postgres data from Docker container to host Postgres.
# Run BEFORE switching DATABASE_URL to host 127.0.0.1:5432.
set -euo pipefail

CONTAINER="${CHURCHHUB_PG_CONTAINER:-churchhub-postgres}"
DUMP="/tmp/churchhub-docker-$(date +%Y%m%d%H%M%S).sql"

echo "==> Dump from Docker container: $CONTAINER"
docker exec "$CONTAINER" pg_dump -U churchhub -d churchhub --no-owner --no-acl >"$DUMP"
echo "Saved: $DUMP ($(wc -c <"$DUMP") bytes)"

echo ""
echo "On HOST Postgres, create DB/user if needed, then:"
echo "  psql -U postgres -c \"CREATE USER churchhub WITH PASSWORD 'your-password';\""
echo "  psql -U postgres -c \"CREATE DATABASE churchhub OWNER churchhub;\""
echo "  psql -U postgres -d churchhub -c \"GRANT ALL ON SCHEMA public TO churchhub;\""
echo "  psql -U churchhub -d churchhub -f $DUMP"
echo ""
echo "If import was done as postgres and migrate fails, run:"
echo "  ./scripts/deploy/pm2-fix-db-permissions.sh"
echo ""
echo "Then set in .env:"
echo "  DATABASE_URL=postgresql://churchhub:your-password@127.0.0.1:5432/churchhub?schema=public"
