# Youth Community Module — Phase 1 Codebase Scan & Diff Analysis

**Repository:** `ChurchApp` (monorepo: `apps/api`, `apps/web`, `packages/shared-types`)  
**Scan date:** Phase 1 foundation  
**Scope:** Youth, chat, feed, prayer, events, gamification, media — no feature implementation in this phase.

---

## Executive summary

| Area | Status | Notes |
|------|--------|-------|
| **1. Community Feed** | Schema only | `YouthPost`, likes, comments, reports in Prisma; **no API/UI** |
| **2. Group chat** | Partial | HTTP chat in `youth.service` + `YouthChatPanel`; **no WebSockets for youth**; overlaps **Communications** `ChatChannel` |
| **3. Events & RSVP** | Partial | `YouthEvent`, RSVP, check-in, basic UI; **no friends-attending, gallery, bus link UI** |
| **4. Gamification** | Partial | Points/badges/streaks in monolithic service; schema has `xp`/`level`, challenges/rewards models **unused** |
| **5. Short-form clips** | Schema only | `YouthClip` models; **no API/UI** |
| **6. Anonymous Q&A** | Duplicated | `YouthHelpRequest` + Help Zone UI **vs** `YouthQuestion` schema **without API** — consolidate in Phase 2 |
| **7. Prayer wall** | Schema only | `YouthPrayerRequest`, taps, encouragements; **no API/UI** |

**GrowthApp workspace:** No youth module (CRM/marketing product). All youth work lives in **ChurchApp**.

---

## Backend (`apps/api`)

### Existing youth module (monolithic)

| File | Role | Phase 2 action |
|------|------|----------------|
| `src/modules/youth/youth.module.ts` | Single module | Import feature submodules (Phase 1 scaffold) |
| `src/modules/youth/youth.controller.ts` | All `/youth/*` routes | Split into feature controllers |
| `src/modules/youth/youth.service.ts` | ~500 lines, all domains | Split into `feed/`, `chat/`, `events/`, etc. |
| `src/modules/youth/youth.constants.ts` | Badges, points, keywords | Move shared rules to `common/` |
| `src/modules/youth/common/moderation.util.ts` | Moderation + feed helpers | Keep in `common/` |

### API routes today (`/youth`)

| Prefix | Feature target | Maturity |
|--------|----------------|----------|
| `GET stats`, `GET members` | Overview | OK |
| `groups/*` | Legacy groups (not in 7-feature list) | OK, keep under `common` or `groups` |
| `events/*` | **3. Events** | MVP |
| `channels/*`, `messages/*` | **2. Chat** | MVP HTTP only |
| `resources/*` | Legacy resources hub | OK |
| `help/*` | Overlaps **6. Q&A** | MVP |
| `leaderboard`, `badges`, `gamification/*` | **4. Gamification** | MVP |
| `parents/*` | Legacy guardian linking | OK |

**Missing route namespaces (schema ready):** `/youth/feed`, `/youth/clips`, `/youth/qa`, `/youth/prayer`, `/youth/chat/dm`, WebSocket events.

### Overlap: Communications module

| Capability | Youth module | Communications module |
|------------|--------------|------------------------|
| `ChatChannel` + `Message` | Youth group channels | Church-wide + service unit channels |
| Moderation | Keyword filter in `youth.service` | Same pattern in `communications.service` |
| Realtime | None | `RealtimeGateway` (`/realtime`) — bus + service units only |

**Recommendation:** Extract shared `ChatChannel` access into `youth/chat` + `communications` adapter; extend `RealtimeGateway` with `youth:*` events in Phase 2.

### Overlap: Notifications

- Push/broadcast via `NotificationsModule` / `communications/notifications`.
- Youth events should call notification queue for RSVP reminders (Phase 2).

### Overlap: Bus ministry

- `YouthEvent.busRouteId` + `BusRoute` relation added in schema.
- `bus.service.ts` + `RealtimeGateway` for live tracking — wire in **events** submodule Phase 2.

### Realtime

- `src/modules/realtime/realtime.gateway.ts` — Socket.IO namespace `/realtime`.
- **No** `join-youth-channel` or `youth:message` handlers yet.

---

## Prisma (`apps/api/prisma/schema.prisma`)

### Implemented models (entry points)

| Block | Models | Wired to API |
|-------|--------|--------------|
| Core youth | `YouthGroup`, `YouthGroupMember`, `YouthEvent`, `YouthEventRsvp`, `YouthAttendance`, `YouthEventMedia` | Partial |
| Resources / help | `YouthResource`, `YouthHelpRequest`, `YouthHelpResponse` | Yes |
| **Feed** | `YouthPost`, `YouthPostLike`, `YouthPostComment`, `YouthContentReport`, `YouthDirectMessage` | No |
| **Clips** | `YouthClip`, `YouthClipLike`, `YouthClipSave` | No |
| **Q&A** | `YouthQuestion`, `YouthQuestionAnswer` | No |
| **Prayer** | `YouthPrayerRequest`, `YouthPrayerTap`, `YouthPrayerEncouragement` | No |
| **Gamification+** | `YouthChallenge`, `YouthReward`; `MemberGamification.xp`, `level` | Partial |
| Shared chat | `ChatChannel`, `Message` (`isPinned` added) | Partial |

**Migration note:** Run `prisma db push` after Phase 1 review if DB is behind schema.

See `docs/youth/PRISMA-ENTRY-POINTS.md` for module ↔ model map.

---

## Frontend (`apps/web`)

### Routing

| Path | File | Notes |
|------|------|-------|
| `/dashboard/youth` | `app/dashboard/youth/page.tsx` | Tab shell (8 tabs, legacy names) |
| `/dashboard/youth/feed` | Phase 1 placeholder route | Scaffold only |
| `/dashboard/youth/chat` | Phase 1 placeholder | Scaffold only |
| … | `events`, `clips`, `gamification`, `qa`, `prayer` | Scaffold only |

### Components (flat, pre-modular)

| Component | Maps to 7 features | Action |
|-----------|-------------------|--------|
| `YouthOverviewPanel` | Overview | Keep |
| `YouthGroupsPanel` | Legacy | `legacy/` or keep |
| `YouthEventsPanel` | **3. Events** | Move → `events/` |
| `YouthChatPanel` | **2. Chat** | Move → `chat/` |
| `YouthGamificationPanel` | **4. Gamification** | Move → `gamification/` |
| `YouthHelpPanel` | **6. Q&A** (counseling) | Move → `qa/`; merge with `YouthQuestion` later |
| `YouthResourcesPanel` | Legacy | Keep |
| `YouthParentsPanel` | Legacy | Keep |
| — | **1. Feed** | **Missing** |
| — | **5. Clips** | **Missing** |
| — | **7. Prayer** | **Missing** |

### Config

- `lib/youth.ts` — tab IDs do not match 7-feature spec (no `feed`, `clips`, `prayer`, `qa` tabs).
- Phase 2: align `YOUTH_TABS` with product spec.

---

## Shared types (`packages/shared-types`)

- Has `membership`, `follow-up`, `bus`, `outreach` — **no `youth` package yet**.
- Phase 1 adds `src/youth/index.ts` stub for cross-app contracts.

---

## Duplication & consolidation plan (Phase 2+)

1. **Help Zone vs Q&A** — `YouthHelpRequest` (pastoral/crisis) vs `YouthQuestion` (faith/life public board). Keep both; separate UIs under `qa/` and `help/`.
2. **Chat moderation** — Deduplicate `scanContent` into `youth/common/moderation.util.ts`; import from communications or shared lib.
3. **ChatChannel listing** — Youth and Communications both list channels; unify query filters by `channelType`.
4. **Gamification** — `Badge` table is church-wide; youth-specific badges in `youth.constants`; extend `gamification/` rules engine.

---

## TypeScript strict mode

| Package | `strict` |
|---------|----------|
| `apps/api/tsconfig.json` | `true` |
| `apps/web/tsconfig.json` | `true` |
| `packages/shared-types/tsconfig.json` | verify `true` |

Phase 1 scaffolds use `strict` types only (no `any` in new files).

---

## Phase 1 deliverables checklist

- [x] Repository scan (this document)
- [x] Diff / gap analysis (tables above)
- [x] `/modules/youth` subdirectories: `feed`, `chat`, `events`, `clips`, `gamification`, `qa`, `prayer`, `common`
- [x] NestJS submodule registration (empty providers)
- [x] Next.js route placeholders under `/dashboard/youth/*`
- [x] Web component folder mirrors under `components/youth/*`
- [x] Prisma entry-point documentation
- [x] `@church-hub/shared-types` youth stub
- [ ] Feature implementation (explicitly **out of scope** for Phase 1)

---

## Recommended Phase 2 order

1. `common` + Prisma migrate + split `youth.service`  
2. `feed` + `prayer` (high engagement)  
3. `chat` + WebSocket gateway  
4. `events` social layer + bus  
5. `gamification` rules + rewards  
6. `clips` + `qa`  
7. Frontend tab migration + IG/Reels UIs  
8. Tests per submodule  
