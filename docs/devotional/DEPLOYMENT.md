# Devotional Hub — Production Deployment

## Prerequisites

- Node 20+, pnpm 9+
- Postgres 16+
- Redis 7+ (optional; `REDIS_ENABLED=true` for queues/cache)
- S3-compatible storage for uploads

## Environment

Copy `.env.production.example` → production secret store. Required:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`
- `S3_*` for file storage
- `DEVOTIONAL_AI_MODEL` when using real AI (optional stub without)

## Database

```bash
pnpm --filter @church-hub/api exec prisma migrate deploy
pnpm --filter @church-hub/api prisma:seed   # first deploy only
```

## Build & run

```bash
pnpm install --frozen-lockfile
pnpm --filter @church-hub/shared-types build
pnpm --filter @church-hub/api build
pnpm --filter @church-hub/web build
```

### Docker

```bash
docker compose -f docker-compose.yml -f infra/docker/docker-compose.prod.yml up -d
docker build -f infra/docker/Dockerfile.api -t churchhub-api .
docker build -f infra/docker/Dockerfile.web -t churchhub-web .
```

Web image requires `output: 'standalone'` in `apps/web/next.config.js` (Phase 12).

### Kubernetes

Manifests: `infra/kubernetes/api-deployment.yaml`, `web-deployment.yaml`.

- Liveness: `GET /api/v1/health`
- Secrets: `churchhub-secrets` (create per cluster)
- Ingress TLS for web + API

## Smoke test after deploy

1. Login → Devotional Hub → Today tab loads cached plan.
2. `RUN_DEVOTIONAL_E2E=true` against staging API.
3. Offline banner + sync (optional PWA).

## Rollback

1. Redeploy previous API/web image tags.
2. If schema changed: restore DB from backup **or** forward-fix migration (never `migrate reset` on prod).

## Monitoring

- API logs: watch 429 on `/devotional-hub/ai/*` (rate limit)
- DB: connection pool, slow queries on `devotional_ai_artifacts`
- Alerts: health check failures, backup job failures
