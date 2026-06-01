# Phase 9 — Prayer Wall (Tap-to-Pray)

## API (`/api/v1/youth/prayer`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/feed` | Active prayer wall (`?category=`) |
| GET | `/my` | Current member's requests |
| GET | `/notifications` | "Someone prayed for you" in-app notifications |
| POST | `/requests` | Create request (anonymous or personal) |
| GET | `/requests/:id` | Request detail + encouragements |
| PATCH | `/requests/:id` | Update own request |
| DELETE | `/requests/:id` | Archive (soft remove) |
| POST | `/requests/:id/pray` | Tap-to-pray (once per member) |
| POST | `/requests/:id/encourage` | Encouragement comment |
| PATCH | `/requests/:id/hide` | Leader moderation |

## Anonymous vs personal

- **Anonymous** (default): `isAnonymous: true`, optional `alias`, `memberId` stored for owner features but hidden as `displayName`.
- **Personal**: `isAnonymous: false` — shows member first name on the feed.

## Tap-to-pray

- Creates `YouthPrayerSupport` with `supportType: PRAY` (unique per member per request).
- Increments `prayCount` on the request.
- Awards +5 gamification points (`DEVOTIONAL`) to the pray-er.
- Notifies request owner via `Notification` (`type: YOUTH_PRAYER`) + WebSocket `youth:notification`.

## Encouragements

- `supportType: ENCOURAGEMENT` with `body` (one per member per request; upsert to edit).
- Optional notification to owner when comments are enabled.

## Web

- `/dashboard/youth/prayer` — `YouthPrayerPanel` (feed, share, my requests, notification banner)

## Shared types

`packages/shared-types/src/youth/prayer.ts`

## Seed

Demo requests for Emma, Lily, Noah with pray + encouragement sample.
