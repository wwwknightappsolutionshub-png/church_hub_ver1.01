# Prisma entry points — Youth Community Module (Phase 2)

Primary file: `apps/api/prisma/schema.prisma`  
Section: `// ─── Youth Community Module — Phase 2 Prisma Schema`

Full deliverable map: [PHASE2-SCHEMA.md](./PHASE2-SCHEMA.md)

## Module ↔ model map

| Submodule | Primary models |
|-----------|----------------|
| `feed` | `YouthPost`, `YouthComment`, `YouthReaction`, `YouthMedia` |
| `chat` | `ChatChannel`, `Message`, `YouthChannelMember`, `YouthMessageReadReceipt`, `YouthDirectMessage` |
| `events` | `YouthEvent`, `YouthEventRsvp`, `YouthEventMedia`, `YouthAttendance` |
| `clips` | `YouthSermonClip` |
| `gamification` | `YouthUserLevel`, `YouthPointLedger`, `YouthAchievement`, `YouthChallenge`, `Badge`, `MemberBadge`, `YouthReward` |
| `qa` | `YouthQuestion`, `YouthAnswer`, `YouthHelpRequest` |
| `prayer` | `YouthPrayerRequest`, `YouthPrayerSupport` |
| `common` | `YouthGroup`, `YouthGroupMember`, `YouthResource`, `YouthContentReport` |

## Commands

```bash
cd apps/api
pnpm exec prisma db push
pnpm exec prisma generate
```
