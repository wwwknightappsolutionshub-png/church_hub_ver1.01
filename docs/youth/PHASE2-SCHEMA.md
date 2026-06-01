# Phase 2 — Youth Prisma Schema

**Status:** Schema complete. No business logic in this phase.

## Deliverable → Prisma model map

| Deliverable | Prisma model | Table (`@@map`) |
|-------------|--------------|-----------------|
| **Post** | `YouthPost` | `youth_posts` |
| **Comment** | `YouthComment` | `youth_comments` |
| **Reaction** | `YouthReaction` | `youth_reactions` |
| **Media** | `YouthMedia` | `youth_media` |
| **ChatChannel** | `ChatChannel` | `chat_channels` |
| **ChatMessage** | `Message` | `messages` |
| **Event** | `YouthEvent` | `youth_events` |
| **RSVP** | `YouthEventRsvp` | `youth_event_rsvps` |
| **SermonClip** | `YouthSermonClip` | `youth_sermon_clips` |
| **PrayerRequest** | `YouthPrayerRequest` | `youth_prayer_requests` |
| **PrayerSupport** | `YouthPrayerSupport` | `youth_prayer_supports` |
| **Question** | `YouthQuestion` | `youth_questions` |
| **Answer** | `YouthAnswer` | `youth_answers` |
| **Badge** | `Badge` | `badges` (church-wide) |
| **Achievement** | `YouthAchievement` | `youth_achievements` |
| **PointLedger** | `YouthPointLedger` | `youth_point_ledger` |
| **Challenge** | `YouthChallenge` | `youth_challenges` |
| **UserLevel** | `YouthUserLevel` | `youth_user_levels` |

## Supporting entities (Phase 2)

| Model | Purpose |
|-------|---------|
| `YouthEventMedia` | Event gallery media |
| `YouthAttendance` | Check-in / attendance streaks |
| `YouthDirectMessage` | Private DMs (chat submodule) |
| `YouthChannelMember` | Roles, mute, channel membership |
| `YouthMessageReadReceipt` | Read receipts on `Message` |
| `YouthMemberAchievement` | Achievement unlock join |
| `YouthChallengeProgress` | Per-member challenge progress |
| `YouthReward` | Points redemption catalog |
| `MemberGamification` | Legacy points/streaks (coexists with `YouthUserLevel`) |
| `MemberBadge` | Badge awards via global `Badge` |
| `YouthContentReport` | Feed/chat moderation reports |
| `YouthHelpRequest` | Pastoral help (separate from public Q&A) |

## Phase 2 migrations from Phase 1 draft

| Removed / renamed | Replacement |
|-------------------|-------------|
| `YouthPostLike` | `YouthReaction` (`reactionType: LIKE`) |
| `YouthPostComment` | `YouthComment` |
| `YouthClip` | `YouthSermonClip` |
| `YouthClipLike` / `YouthClipSave` | `YouthReaction` (`LIKE`, `SAVE`) |
| `YouthPrayerTap` | `YouthPrayerSupport` (`supportType: PRAY`) |
| `YouthPrayerEncouragement` | `YouthPrayerSupport` (`supportType: ENCOURAGEMENT`) |
| `YouthQuestionAnswer` | `YouthAnswer` |

## Apply schema

```bash
cd apps/api
pnpm exec prisma db push
pnpm exec prisma generate
```

Stop the API process first on Windows if `generate` hits `EPERM`.

## Submodule ownership

| Folder | Models |
|--------|--------|
| `feed/` | Post, Comment, Reaction, Media |
| `chat/` | ChatChannel, Message, YouthChannelMember, YouthMessageReadReceipt, YouthDirectMessage |
| `events/` | YouthEvent, YouthEventRsvp, YouthEventMedia, YouthAttendance |
| `clips/` | YouthSermonClip |
| `gamification/` | YouthUserLevel, YouthPointLedger, YouthAchievement, YouthChallenge, Badge, YouthReward |
| `qa/` | YouthQuestion, YouthAnswer, YouthHelpRequest |
| `prayer/` | YouthPrayerRequest, YouthPrayerSupport |
