# Devotional Hub — Backup & Recovery

Devotional data lives in Postgres tables: `devotional_*` (plans, groups, journals, prayer, challenges, AI artifacts, PDF imports).

## Automated backup (recommended)

### Logical backup (`pg_dump`)

```bash
# From repo root (requires DATABASE_URL or PG* env)
./scripts/ops/pg-backup.sh
```

Output: `backups/churchhub-YYYYMMDD-HHMMSS.sql.gz`

Cron example (daily 02:00 UTC):

```cron
0 2 * * * cd /opt/churchhub && DATABASE_URL='postgresql://...' ./scripts/ops/pg-backup.sh
```

### Managed Postgres

- **AWS RDS:** enable automated backups, retention ≥ 7 days; final snapshot on delete.
- **Neon / Supabase:** use provider backup UI + point-in-time recovery.

## Restore

```bash
./scripts/ops/pg-restore.sh backups/churchhub-20260526-020000.sql.gz
```

**Warning:** restore to an empty database or staging first. Never overwrite production without maintenance window.

## What to back up besides DB

| Asset | Location |
|-------|----------|
| Uploaded PDFs / media | S3 bucket (`S3_BUCKET`) |
| Redis (optional) | Ephemeral cache — no backup required |
| Env secrets | Secret manager / K8s secrets |

## Recovery objectives (suggested)

| Metric | Target |
|--------|--------|
| RPO | 24h (daily dump) or 5m (RDS PITR) |
| RTO | 4h (restore + migrate + smoke e2e) |

## Post-restore verification

```bash
pnpm --filter @church-hub/api exec prisma migrate deploy
RUN_DEVOTIONAL_E2E=true pnpm --filter @church-hub/api test:e2e
```
