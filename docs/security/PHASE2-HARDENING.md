# Phase 2 security hardening (live-safe)

Governance: [`.cursor/rules/security.mdc`](../../.cursor/rules/security.mdc).

## Flags (default safe for production)

| Env | Default | Purpose |
|-----|---------|---------|
| `PASTORAL_NOTES_KEY` | required in prod | AES-256-GCM key for pastoral notes |
| `ENABLE_DB_RLS` | `false` | When `true`, request txs set `app.rls_enforced` |
| `BACKUP_OFFSITE_ENABLED` | `false` | S3-compatible off-site upload after local write |
| `ENABLE_SOFT_DELETE_PURGE` | `false` | Hourly hard-purge after retention window |
| `BACKUP_SOFT_DELETE_RETENTION_DAYS` | `30` | Soft-delete recovery window |
| `ENABLE_SWAGGER` | off in prod | Override to expose `/api/docs` in production |

## Rollout order

1. Deploy code (Swagger off in prod, session revoke, dual-read pastoral crypto).
2. Set `PASTORAL_NOTES_KEY` in production `.env` **before** restart.
3. Run migration `20261124010000_security_soft_delete_audit_rls`.
4. Backfill: `pnpm exec ts-node scripts/encrypt-legacy-pastoral-notes.ts` (then without `--dry-run`).
5. Soak Prisma tenant ALS; keep `ENABLE_DB_RLS=false`.
6. Provision Object-Lock bucket → `BACKUP_OFFSITE_ENABLED=true`.
7. After soak, consider `ENABLE_DB_RLS=true` and verify platform/backup jobs still use bypass.

## Scripts

- `apps/api/scripts/encrypt-legacy-pastoral-notes.ts`
- `apps/api/scripts/verify-backup-restore.ts <storageKey>`
