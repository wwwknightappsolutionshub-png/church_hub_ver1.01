# Phase 10 — Full Integration & Youth Safety

## Gamification integrations

All modules call `YouthGamificationService.scoreEvent` via `YOUTH_GAMIFICATION_INTEGRATIONS` (`gamification.integrations.ts`).

| Module | Trigger | Source | Points (default) |
|--------|---------|--------|------------------|
| Events | RSVP (first GOING) | `RSVP` | 10 |
| Events | Check-in | `ATTENDANCE` | 25 |
| Feed | Post (not flagged) | `POST` | 5 |
| Feed | Comment | `COMMENT` | 3 |
| Chat | Channel message | `COMMENT` | 3 |
| Q&A | Submit question | `COMMENT` | 3 |
| Q&A | Private/public answer | `SERVE` | 20 |
| Prayer | Share request | `DEVOTIONAL` | 5 |
| Prayer | Tap to pray | `DEVOTIONAL` | 5 |
| Prayer | Encouragement | `REACTION` | 1 |
| Help | Resolved | `SERVE` | 20 |

## Youth-safe content filters

`scanYouthContent()` in `common/safety.util.ts`:

- Harm keywords (spam, hate, bullying, etc.)
- **Strict mode** (default for youth): blocks phone numbers, emails, external URLs
- Leaders use relaxed strict mode (`strictSafeMode: false`) on their own posts

Applied in: feed, chat, Q&A, prayer.

## Role-based access

`GET /api/v1/youth/context` returns:

- `isLeader` / `isYouth`
- `permissions` (moderate, manage events/groups, award points, Q&A queue, parent links)
- `safeMode` settings
- `gamification` summary (points, level, tier)

Web: `YouthProvider` + `useYouthContext()`; hub tabs and moderator UI respect permissions.

## UI consolidation

- `app/dashboard/youth/layout.tsx` — `YouthShell` with skip link, safe-mode banner, feature nav
- `lib/youth/features.ts` — unified feature cards
- Hub overview uses the same feature list

## Accessibility

- Skip to main content link
- `role="tablist"` / `aria-selected` on hub tabs
- `aria-current="page"` on feature nav
- `aria-pressed` on moderator toggle
- `aria-live` on safe-mode banner
- `id="youth-main"` focus target

## Smoke test

1. `GET /youth/context` as admin vs youth-linked user.
2. Post with `call me 555-123-4567` as youth → blocked.
3. RSVP + pray + ask question → ledger entries in `/youth/gamification/me`.
4. Open `/dashboard/youth/feed` — feature nav + safe banner visible.
