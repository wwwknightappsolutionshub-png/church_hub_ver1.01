# Phase 8 — Anonymous Q&A

## Separation from Help Zone

| Feature | Model | UI | Purpose |
|---------|-------|-----|---------|
| **Help Zone** | `YouthHelpRequest` | Hub tab `YouthHelpPanel` | Pastoral / crisis counsel |
| **Q&A** | `YouthQuestion`, `YouthAnswer` | `/dashboard/youth/qa` | Faith & life questions, public board |

## API (`/api/v1/youth/qa`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/board` | Public published Q&A (`?category=`) |
| GET | `/my` | Current member's questions + private replies |
| GET | `/queue` | Leader dashboard (leaders only) |
| GET | `/moderation/hidden` | Hidden questions (leaders) |
| POST | `/questions` | Submit anonymous question |
| GET | `/questions/:id` | Question detail (owner or leader) |
| PATCH | `/questions/:id/assign` | Assign leader |
| POST | `/questions/:id/reply` | Private reply to asker |
| POST | `/questions/:id/publish` | Publish public board answer |
| PATCH | `/questions/:id/hide` | Moderation hide |
| PATCH | `/questions/:id/restore` | Restore from hidden |

## Flow

1. Youth submits question → `OPEN` (or `HIDDEN` if moderation keywords hit).
2. Leader assigns → `ASSIGNED`.
3. Leader private reply → `ANSWERED` + `YouthAnswer` (`isPublic: false`).
4. Leader publishes sanitized answer → `PUBLIC` + public `YouthAnswer`.
5. Public board lists `status: PUBLIC` questions only.

## Privacy

- `memberId` is stored when the user is logged in (for “My questions” and private replies) but **not** exposed on the public board.
- Public board shows `alias` only; leader names on public answers are generic (“Youth Leader”).

## Moderation hooks

- `scanContentForModeration()` on submit, reply, and publish (`qa.hooks.ts`).
- Auto-`HIDDEN` on keyword match; leaders restore via `/restore` or review in hidden list.

## Web

- `/dashboard/youth/qa` — `YouthQaPanel` (Ask, Public board, My questions, Leader queue)

## Shared types

`packages/shared-types/src/youth/qa.ts` — `YouthQuestionDto`, categories, statuses.

## Seed

Demo public Q&A, answered private reply, and open queue item (run `pnpm --filter api prisma db seed`).
