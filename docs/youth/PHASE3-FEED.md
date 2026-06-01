# Phase 3 — Community Feed

## API (`/api/v1/youth/feed`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/posts` | Cursor feed (`sort=recent\|top`, `cursor`, `limit`, `youthGroupId`, `moderator`) |
| GET | `/posts/flagged` | Moderators: flagged/hidden posts |
| GET | `/posts/:postId` | Single post |
| POST | `/posts` | Create post (+ inline `media[]`) |
| PATCH | `/posts/:postId` | Edit own post (leaders: any) |
| DELETE | `/posts/:postId` | Soft-delete (REMOVED) |
| GET | `/posts/:postId/comments` | Threaded comments |
| POST | `/posts/:postId/comments` | Add comment |
| POST | `/reactions` | Add/toggle reaction on post or comment |
| DELETE | `/reactions` | Remove reaction (body: `postId` or `commentId`, `reactionType`) |
| POST | `/media` | Register media URL before attach |
| POST | `/posts/:postId/report` | User report |
| GET | `/reports` | Moderators: open reports |
| PATCH | `/reports/:reportId` | Review report |
| PATCH | `/posts/:postId/moderate` | Moderators: set status |

## Feed algorithm

- **Recent:** `createdAt desc`, cursor by `(createdAt, id)`
- **Top:** `engagementScore desc` then `createdAt`, score = likes×2 + comments×3 + shares×5 + recency boost (48h window)
- Denormalized counters updated on reaction/comment changes

## Moderation

- Keyword scan on create/edit → `FLAGGED` + auto-report
- Comments blocked if flagged (not stored)
- Leaders: reports queue, approve/hide/remove

## Web

- Route: `/dashboard/youth/feed`
- Components: `YouthFeedPanel`, `YouthPostComposer`, `YouthFeedList` (infinite scroll), `YouthPostCard`, `YouthFeedModeration`

## Try it

```bash
# Reseed demo posts (optional)
cd apps/api && pnpm exec prisma db seed

# Restart API after schema/client changes
```

Login as `admin@demo.church` — open **Youth → Open feed** or `/dashboard/youth/feed`.
