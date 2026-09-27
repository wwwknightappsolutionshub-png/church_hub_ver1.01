# Church Hub — Hybrid Backup & Recovery

Production backup covers **full database** disaster recovery and **per-tenant** export packages for portability / offboarding.

## Architecture

| Layer | Purpose | Mechanism |
|-------|---------|-----------|
| Full DB | Platform DR | Logical dump → gzip → **AES-256-GCM at rest** under `BACKUP_STORAGE_ROOT` |
| Tenant export | Church portability | JSON.gz of `churchId`-scoped tables (deny-listed + redacted) → encrypted at rest |
| Requests | Manual tenant ask | Church staff request → platform approve → export job |
| Schedules | Automation | Global FULL_DB and optional per-tenant schedules (UTC) |
| Offsite | Secondary host | `scripts/ops/backup-offsite-rsync.sh` (copies ciphertext) |

API surface:

- Platform: `GET/POST /api/v1/platform/backups/*` (permissions `platform.backups:read|write|download`)
- Tenant: `GET/POST /api/v1/backups/requests`, artifact download with short-lived **single-use** HMAC token via `X-Backup-Download-Token` header (never put the token in the URL)

UI:

- Platform console → **Backups**
- Church **Settings** → Data backup request (church staff)

## Environment

```bash
DATABASE_URL=postgresql://...
BACKUP_STORAGE_ROOT=/var/churchhub/backups   # must NOT be under uploads/public; mode 0700
BACKUP_DOWNLOAD_SECRET=<≥32 random chars>   # required in production (HMAC download tokens)
BACKUP_ENCRYPTION_KEY=<64 hex chars OR base64 of 32 bytes>  # required in production (AES-256-GCM)
REDIS_ENABLED=true                           # optional; inline queue fallback if false

# Offsite (cron on primary)
BACKUP_OFFSITE_SSH=backup@secondary-host
BACKUP_OFFSITE_PATH=/var/churchhub/backups
BACKUP_OFFSITE_SSH_KEY=/root/.ssh/churchhub_backup_ro
```

Generate an encryption key:

```bash
openssl rand -hex 32
```

Host requirement for full DB jobs: PostgreSQL client tools on PATH (`pg_dump`). The app passes connection details via `PG*` environment variables (connection string is not put on process argv).

## Security

- Tenant exports redact credential columns and deny platform/meta tables.
- Artifacts on disk are AES-256-GCM envelopes (`CHB1` magic). Authorized downloads decrypt in the API so operators receive usable `.sql.gz` / `.json.gz`.
- Stolen disk/offsite files without `BACKUP_ENCRYPTION_KEY` are unreadable.
- Download tokens: HMAC + stored SHA-256 hash, 10-minute TTL, single-use.
- Tenant downloads limited to approved request artifacts for that church only.
- Tenant backup requests capped at 3 per church per rolling 24 hours.
- Storage root refused if under web-served paths; directories `0700`, files `0600`.
- Treat any decrypted full dump as equivalent to root access to the data.

## Offsite secondary VPS

```bash
# On primary (cron daily after scheduled backups)
export BACKUP_STORAGE_ROOT=/var/churchhub/backups
export BACKUP_OFFSITE_SSH=backup@secondary.example
export BACKUP_OFFSITE_PATH=/var/churchhub/backups
export BACKUP_OFFSITE_SSH_KEY=/root/.ssh/churchhub_backup
bash /path/to/church-hub/scripts/ops/backup-offsite-rsync.sh
```

Encrypt the secondary disk (LUKS / cloud volume encryption). Prefer an SSH key that can only rsync into the backup path.

Offline decrypt of a copied `.enc` file:

```bash
export BACKUP_ENCRYPTION_KEY=...
bash scripts/ops/backup-decrypt.sh /path/to/file.sql.gz.enc > file.sql.gz
```

## Ops notes

1. Deploy migration `20260927150000_hybrid_backups`.
2. Set `BACKUP_ENCRYPTION_KEY` and `BACKUP_DOWNLOAD_SECRET` before production boot.
3. Ensure platform role sync picks up `platform.backups:*` permissions.
4. Schedule offsite rsync; prune old files per retention.
5. Test restore quarterly on staging (decrypt → gunzip → restore), never overwrite production without a maintenance window.

## Legacy scripts

`scripts/ops/pg-backup.sh` and `pg-restore.sh` remain valid for emergency CLI use. The in-app worker is the primary production path.
