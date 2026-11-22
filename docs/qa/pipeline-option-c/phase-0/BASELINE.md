# Phase 0 — Pipeline Option C Baseline Lock

**Date:** 2026-11-22  
**Scope:** Capture current membership pipeline behavior. **No product/schema changes.**  
**Purpose:** Regression anchor before Phase 1 (schema + seed + resolve).

---

## Stage order (canonical)

Prisma enum `FollowUpStage` and API/web constants agree on:

| Order | Key | UI label | Short badge |
|------:|-----|----------|-------------|
| 1 | `NEW_LEAD` | New Contacts | Fresh |
| 2 | `CONTACTED` | Contacted | Contacted |
| 3 | `VISITED` | Attended Service | Service |
| 4 | `ATTENDED` | Engrafted In WSF | WSF |
| 5 | `JOINED_GROUP` | Joined Group | Joined |
| 6 | `ENLISTED_FOR_BAPTISM` | Enlisted for Baptism | Baptism |

**Sources**

- `apps/api/prisma/schema.prisma` — `enum FollowUpStage`
- `apps/api/src/modules/follow-up/follow-up.constants.ts` — `FOLLOW_UP_STAGE_ORDER`
- `apps/web/lib/follow-up.ts` — `FOLLOW_UP_STAGES`, `STAGE_LABELS`, `STAGE_SHORT`

---

## Phases (UI grouping)

| Phase | Id | Title | Stages |
|------:|----|-------|--------|
| 1 | `outreach` | Initial Outreach | `NEW_LEAD`, `CONTACTED` |
| 2 | `engagement` | Growing Engagement | `VISITED`, `ATTENDED` |
| 3 | `belonging` | Belonging & Discipleship | `JOINED_GROUP`, `ENLISTED_FOR_BAPTISM` |

Source: `PIPELINE_COLUMNS` in `apps/web/lib/follow-up.ts`.

---

## SLA / due rules (as of baseline)

| Rule | Value | Stages |
|------|-------|--------|
| Assignment stage SLA | 72h (env `FOLLOW_UP_ASSIGNMENT_SLA_HOURS`) | Active: `NEW_LEAD`, `CONTACTED`, `VISITED`, `ATTENDED` |
| Graduated (SLA exempt) | — | `JOINED_GROUP`, `ENLISTED_FOR_BAPTISM` |
| Due today window | 12–24h after assign/progress | Same active set via `lastProgressAt` |

Source: `apps/api/src/modules/follow-up/follow-up-assignment-sla.ts`.

---

## Archive rules (as of baseline)

| Rule | Behavior |
|------|----------|
| Archive blocked | `stage === 'JOINED_GROUP'` (`isArchiveBlockedStage`) |
| Hardcoded notify | Joined-group day-6 / archive flows key off `JOINED_GROUP` in follow-up service |

Source: `apps/web/lib/follow-up.ts`; `apps/api/src/modules/follow-up/follow-up.service.ts`.

---

## Entry path (as of baseline)

- Manual create / outreach capture → stage **`NEW_LEAD`**
- Advance = next index in fixed `FOLLOW_UP_STAGE_ORDER` / `FOLLOW_UP_STAGES`

---

## Manager audience (UI)

Card-grid Membership Pipeline + stage filter strip: `establishmentAccess.mode === 'manager'`  
(Admin / Church Pastor / Follow-up unit leader — and other manager unit leaders per access matrix).

---

## Baseline test suites (must stay green)

| Suite | Command |
|-------|---------|
| API unit (follow-up) | `pnpm --filter @church-hub/api exec jest --testPathPattern=follow-up --runInBand --forceExit` |
| Playwright API smoke | `pnpm --filter @church-hub/web exec playwright test e2e/follow-up-api.spec.ts` |
| Playwright Phase 5 journey | `pnpm --filter @church-hub/web exec playwright test e2e/establishment-phase5-api.spec.ts` |
| Playwright UI (if env ready) | `pnpm --filter @church-hub/web exec playwright test e2e/follow-up.spec.ts` |

Proof artifacts: this folder (`*.log`, `CHECKLIST.md`, `GO-NO-GO.md`).
