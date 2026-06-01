# Phase 11 — Testing & Hardening

## Unit tests (API)

Run from `apps/api`:

```bash
pnpm test
```

| Suite | Coverage |
|-------|----------|
| `common/safety.util.spec.ts` | Youth-safe content filters |
| `gamification.constants.spec.ts` | Tier titles + integration map |
| `common/cache/redis-cache.service.spec.ts` | Memory cache fallback |
| `bus/route-optimizer.service.spec.ts` | Existing |

## Unit tests (Web)

```bash
pnpm --filter @church-hub/web test
```

- `lib/youth/features.test.ts` — feature route registry

## E2E (API)

```bash
# Requires running DB
pnpm --filter @church-hub/api exec jest --config test/jest-e2e.json

# Skip when no DB
SKIP_E2E=true pnpm --filter @church-hub/api test
```

`test/health.e2e-spec.ts` — `GET /api/v1/health`

## Load tests

```bash
# Login first, export JWT
export ACCESS_TOKEN="..."
export CHANNEL_ID="..."   # optional, for chat messages

node scripts/load/youth-feed.mjs
node scripts/load/youth-chat.mjs
```

Env: `LOAD_REQUESTS`, `LOAD_CONCURRENCY`, `API_URL`

## Redis caching

`RedisCacheService` (global `CacheModule`):

| Key pattern | TTL | Invalidation |
|-------------|-----|--------------|
| `youth:feed:{churchId}:...` | 30s | On new post |
| `youth:chat:channels:...` | 60s | Manual TTL |
| `youth:chat:msgs:{channelId}:public` | 15s | On new message |

- `CACHE_ENABLED=false` — memory-only (tests)
- `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT` — production

## Logging & observability

`LoggingInterceptor` (global):

- JSON logs for `/youth/*` routes
- Slow request warning when > 2s
- Errors logged with path + duration

## Error boundary (Web)

`YouthErrorBoundary` wraps all `/dashboard/youth/*` pages in `layout.tsx`.

## Refactors (Phase 11)

- `YouthAccessService.isLeader()` — single RBAC helper for feed, chat, Q&A, prayer
- Centralized `scanYouthContent()` strict mode by role
