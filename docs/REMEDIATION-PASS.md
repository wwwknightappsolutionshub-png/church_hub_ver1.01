# Remediation Pass (Items 1, 2, 3, 4, 5, 8)

## 1. Migration enforcement

- `MigrationHealthService` runs on API startup; warns or fails when `REQUIRE_MIGRATIONS=true`.
- `GET /api/v1/health/migrations` reports pending migrations and schema markers (`MEDICAL` enum, `dept_schedules` table).
- Scripts: `pnpm --filter @church-hub/api prisma:migrate:deploy`, `prisma:migrate:status`.

## 2. RBAC audit

- **Bus:** `@ModuleGate('busMinistry')` on controller; `@Roles` on staff-only routes; `@BusDriver()` + `BusDriverGuard` on driver routes.
- **Lounge:** `@ModuleGate('profile')` added.
- `BusAccessService` validates driver profile ownership for GPS updates.

## 3. Driver mobile + parent ETA

- **API:** `updateDriverLocation` computes OSRM/heuristic ETA, updates `ride.etaMinutes`, notifies parents via `ParentGuardianLink` → `Notification` (`BUS_PARENT_ETA`).
- **Mobile:** `apps/mobile/app/driver.tsx` uses live API (rides, status, location, emergency).
- **Seed:** `grace@demo.church` gets `DriverProfile` (member role DRIVER).

## 4. OSRM route optimization

- `route-optimizer-osrm.ts` calls OSRM Trip API when `OSRM_BASE_URL` is set.
- `optimizeRoute()` falls back to nearest-neighbor + 2-opt heuristic.
- Per-ride ETA uses OSRM Route API when available.

## 5. Throttling, Zod, Jest thresholds

- Global `@nestjs/throttler` (default 120 req / 60s; env `THROTTLE_*`).
- Bus routes validated with **Zod** via `ZodValidationPipe` (`bus.schemas.ts`).
- Jest global coverage thresholds set to **5%**; bus + migration-health in collectCoverageFrom.

## 8. Expo push + background location

- `lib/push.ts` — Expo notification registration (driver + outreach).
- `lib/driver-location.ts` — foreground watch + `expo-task-manager` background task.
- `app.json` — background location permissions plugin.

## Verify locally

```bash
cd apps/api
pnpm exec prisma migrate deploy
pnpm dev

# Health
curl http://localhost:4000/api/v1/health/migrations

# Mobile driver (grace@demo.church / ChurchHub123! after seed)
cd apps/mobile && pnpm dev
```

Set `OSRM_BASE_URL=http://router.project-osrm.org` in `apps/api/.env` for live routing.
