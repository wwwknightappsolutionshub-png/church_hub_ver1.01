#!/usr/bin/env bash
# Fix host Postgres permissions after importing a database dump as superuser.
# Run once on the VPS, then: cd apps/api && npx prisma migrate deploy
set -euo pipefail

PSQL="${PSQL:-/www/server/pgsql/bin/psql}"
DB="${CHURCHHUB_DB:-churchhub}"
APP_USER="${CHURCHHUB_DB_USER:-churchhub}"

if [[ ! -x "$PSQL" ]] && command -v psql >/dev/null 2>&1; then
  PSQL="$(command -v psql)"
fi

echo "==> Grant ownership of public schema objects to $APP_USER on database $DB"
"$PSQL" -U postgres -d "$DB" -v ON_ERROR_STOP=1 <<EOSQL
GRANT ALL ON SCHEMA public TO ${APP_USER};
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER};
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_USER};

DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO ${APP_USER}', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO ${APP_USER}', r.sequencename);
  END LOOP;
END \$\$;

ALTER SCHEMA public OWNER TO ${APP_USER};
EOSQL

echo "==> Done. Test: cd apps/api && npx prisma migrate deploy"
