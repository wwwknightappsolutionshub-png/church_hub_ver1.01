# Youth Community Module

**Phase 1:** Foundation only — no feature endpoints in submodules yet.

## Documentation

- [PHASE1-SCAN.md](../../../../docs/youth/PHASE1-SCAN.md) — codebase scan & gap analysis
- [FOLDER-MAP.md](../../../../docs/youth/FOLDER-MAP.md) — directory layout
- [PRISMA-ENTRY-POINTS.md](../../../../docs/youth/PRISMA-ENTRY-POINTS.md) — database models

## Active code (legacy, until Phase 2 split)

- `youth.controller.ts` — `/youth/*` HTTP API
- `youth.service.ts` — monolithic business logic

## Submodule scaffolds (Phase 2)

| Folder | Service | Feature |
|--------|---------|---------|
| `feed/` | `YouthFeedService` | Community feed |
| `chat/` | `YouthChatService` | Channels + DMs + WS |
| `events/` | `YouthEventsService` | RSVP + social |
| `clips/` | `YouthClipsService` | Reels |
| `gamification/` | `YouthGamificationService` | XP, badges, rewards |
| `qa/` | `YouthQaService` | Q&A + help |
| `prayer/` | `YouthPrayerService` | Prayer wall |
| `common/` | utilities | Moderation, shared types |
