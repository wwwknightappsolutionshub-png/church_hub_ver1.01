# Phase 6 — Youth Gamification Engine

## Subsystems

| Engine | Models / storage | Notes |
|--------|------------------|-------|
| Points | `YouthPointLedger`, `MemberGamification` | `scoreEvent` / `applyPoints` with `SCORE_DELTAS` |
| XP & levels | `YouthUserLevel` | XP curve; `tierTitleForLevel()` |
| Badges | `YouthBadge`, `YouthMemberBadge` | Auto-issue on thresholds; manual `issueBadge` |
| Achievements | `YouthAchievement`, `YouthMemberAchievement` | Evaluated after each score |
| Challenges | `YouthChallenge`, `YouthChallengeProgress` | Progress + completion awards |

## API (`/api/v1/youth/gamification`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Current user dashboard (points, XP, level, badges, challenges, ledger) |
| GET | `/leaderboard` | Ranked leaderboard (`?limit=25`) |
| GET | `/badges` | Badge catalog |
| GET | `/achievements` | Church achievements |
| GET | `/challenges` | Active challenges (+ progress when authenticated) |
| GET | `/ledger` | Point ledger for current member |
| POST | `/score` | Score event (`source`, optional `memberId`, `delta`, `reason`, `sourceId`) |
| POST | `/challenges` | Create challenge (leaders) |
| POST | `/challenges/:id/progress` | Increment challenge progress |
| POST | `/:memberId/points` | Manual points (leaders) |
| POST | `/:memberId/badges/:badgeId` | Issue badge (leaders) |

**Legacy:** `/api/v1/youth/leaderboard`, `/youth/badges`, `/youth/gamification/:memberId/points` delegate to the same service.

## Scoring integration (dev hooks)

Import from `gamification/gamification.hooks.ts`:

```ts
import { SCORE_DELTAS } from '../gamification/gamification.hooks';
await this.gamification.scoreEvent(churchId, memberId, YouthPointSource.RSVP);
```

| Module | Trigger | Source |
|--------|---------|--------|
| Events | RSVP (first GOING) | `RSVP` |
| Events | Check-in | `ATTENDANCE` (+ streak) |
| Feed | New post | `POST` |
| Feed | Comment | `COMMENT` |
| Chat | Message | `COMMENT` |
| Help | Resolved | `SERVE` |

Default deltas live in `gamification.constants.ts` (`SCORE_DELTAS`).

## Web

- `/dashboard/youth/gamification` — full dashboard (`YouthGamificationDashboard`)
- Youth hub **Gamification** tab — compact leaderboard + leader tools (`YouthGamificationPanel`)

## Seed

`pnpm --filter api prisma db seed` creates default achievements/challenges and demo XP for Emma.

## Shared types

`packages/shared-types/src/youth/gamification.ts` — `YouthGamificationProfile`, `YouthLeaderboardRow`, `YouthPointSource`.
