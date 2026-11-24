# Phase 3 — Audit management, abuse alerts, release notifications

Governance: [`.cursor/rules/security.mdc`](../../.cursor/rules/security.mdc).

## What shipped

| Area | Behavior |
|------|----------|
| `AUTHZ_DENIED` | Roles / module / platform permission guards append denials |
| Abuse window | Default 10 denials / 15 min → `AUTHZ_ABUSE_DETECTED` + ADMIN/PASTOR in-app + branded email |
| Tenant audit UI | Settings → Audit logs (Security \| Member activity \| Follow-up stage) |
| Platform audit UI | Platform → Security Audit (cross-tenant, CSV export) |
| Export | Caps at 5000 rows; logs `AUDIT_LOG_EXPORTED` |
| Cold archive | Opt-in `AUDIT_ARCHIVE_ENABLED` → encrypted `.jsonl.gz.enc` under `backups/audit-archives/` |
| What’s New | `PlatformBroadcast.kind=RELEASE` → banner + drawer; dismiss → notification bell |

## Flags (safe defaults)

| Env | Default | Purpose |
|-----|---------|---------|
| `AUTHZ_ABUSE_THRESHOLD` | `10` | Denials before abuse alert |
| `AUTHZ_ABUSE_WINDOW_MINUTES` | `15` | Sliding window |
| `AUTHZ_DENIED_DEDUPE_SECONDS` | `5` | Cap AUTHZ_DENIED write storms |
| `TRUST_PROXY` | `1` in prod / `false` local | Express trust proxy hops for `req.ip` |
| `AUDIT_ARCHIVE_ENABLED` | `false` | Cold archive (daily check, min interval gate) |
| `AUDIT_ARCHIVE_MIN_INTERVAL_DAYS` | `28` | Skip archive if last completion newer |
| `AUDIT_HOT_RETENTION_DAYS` | `365` | Hot table retention before archive |
| `BACKUP_OFFSITE_ENABLED` | `false` | Required for archive upload |
| `BACKUP_ENCRYPTION_KEY` | required if archive on | AES key for archives (no JWT fallback) |

## Hardening notes

- Abuse counts use DB `countSince` (multi-instance safe); write dedupe limits table growth.
- Client IP from Express `req.ip` only (trust proxy), never raw first `X-Forwarded-For` hop.
- Archive: sanitize metadata, require `BACKUP_ENCRYPTION_KEY`, HEAD-verify size before prune.
- Nested metadata redaction on append / query / export / archive.

## Dedup notes

- No new release table — extends `PlatformBroadcast` + `Notification`.
- Church `Announcement` remains congregation-facing only.
- `MemberActivityLog` / `FollowUpStageAudit` stay separate tables; Settings tabs only.

## Migration

`20261124030000_phase3_audit_releases`
