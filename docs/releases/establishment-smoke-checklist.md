# Establishment split — manual smoke checklist

Sign off each row with pass/fail + notes (status code, screenshot path, or API snippet). Run against a seeded church with Admin login.

## Preflight

| # | Check | Pass? | Evidence |
|---|--------|-------|----------|
| P1 | `GET /api/v1/health` → `status: ok` | | |
| P2 | Migrations applied: `20261122023000_follow_up_wsf_branch`, `20261122024000_follow_up_stage_audit` | | |
| P3 | Admin can open `/dashboard/establishment` | | |

## Redirects & IA

| # | Check | Pass? | Evidence |
|---|--------|-------|----------|
| R1 | `/dashboard/follow-up` lands on `/dashboard/establishment` | | |
| R2 | Manager sees **Membership Pipeline** + **Contact Directory** (not Members / Field Outreach) | | |
| R3 | `/dashboard/outreach` title is **Outreach**; link to Establishment works | | |
| R4 | Member nav shows Establishment (not Follow-up) where expected | | |

## Access modes

| # | Check | Pass? | Evidence |
|---|--------|-------|----------|
| A1 | Admin/Pastor → `accessMode: manager` on `GET /follow-up/stats` | | |
| A2 | Assigned worker sees own cards only (worker dashboard) | | |
| A3 | View-only role cannot PATCH stage (403) | | |
| A4 | Random UUID `GET /follow-up/:id` → 403 or 404 | | |

## Capture → pipeline journey

| # | Check | Pass? | Evidence |
|---|--------|-------|----------|
| J1 | Outreach capture creates contact; Establishment list stage = `NEW_LEAD` | | |
| J2 | New Contact + assign → assignee gets `FOLLOW_UP_ASSIGNED` in NotificationBell | | |
| J3 | Stage advance with what-was-done / what-next writes pastoral note | | |
| J4 | Manager **Stage audit** tab lists from→to with actor | | |
| J5 | Advance to `JOINED_GROUP` (or baptism enlist) increases `graduated` on stats | | |

## Automated suites (record numbers)

```bash
# API unit (Phases 2–4)
cd apps/api
pnpm exec jest --testPathPattern="establishment-access|follow-up-worker-stats|follow-up-phase4" --runInBand

# Playwright Phase 5
cd apps/web
npx playwright test e2e/establishment-phase5-api.spec.ts e2e/establishment-redirects.spec.ts e2e/follow-up.spec.ts e2e/follow-up-api.spec.ts
```

| Suite | Passed | Failed | Skipped | Duration |
|-------|--------|--------|---------|----------|
| Jest establishment/follow-up | 14 | 0 | 0 | 17.8s |
| Playwright establishment Phase 5 (chromium) | 24 | 0 | 0 | 1.0m (local) |

**Sign-off:** __________________  **Date:** __________
