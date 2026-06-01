# Phase 12 — Final Testing & Production Readiness

Devotional Hub production checklist.

## Unit tests

**API:** `pnpm --filter @church-hub/api test`  
**Web:** `pnpm --filter @church-hub/web test`

Covers `devotional-ai-tools`, week/challenge utils, hub tabs/cache.

## Integration / E2E (API)

Runs automatically when `DATABASE_URL` is set. Skip with `SKIP_E2E=true`.

```bash
pnpm --filter @church-hub/api prisma:seed
pnpm --filter @church-hub/api test:e2e
# Or full suite: .\scripts\test-all.ps1
```

See `test/devotional-hub.e2e-spec.ts`, `test/devotional-hub.integration-spec.ts`, `test/health.e2e-spec.ts`.

## Load tests

```bash
export ACCESS_TOKEN=...
node scripts/load/devotional-ai.mjs
node scripts/load/devotional-pdf.mjs
```

## Docs

- [SECURITY-AUDIT.md](./SECURITY-AUDIT.md)
- [BACKUP-RECOVERY.md](./BACKUP-RECOVERY.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)

## Production env

`.env.production.example` at repo root.
