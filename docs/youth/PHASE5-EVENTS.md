# Phase 5 — Youth Events & RSVP

## API (`/api/v1/youth/events`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List events with social proof (`?upcoming=true`) |
| GET | `/:eventId` | Event detail + public RSVPs |
| GET | `/:eventId/friends-attending` | Friends going (group peers) |
| POST | `/` | Create event (leaders) |
| PATCH | `/:eventId` | Update event (leaders) |
| DELETE | `/:eventId` | Delete event (leaders) |
| POST | `/:eventId/rsvp` | RSVP as self or `{ memberId }` for leaders |
| POST | `/:eventId/check-in` | Attendance check-in (leaders) |

**Legacy:** `/api/v1/youth/events` paths delegate to the same service.

## Friends attending

Peers who share a **youth group** with the current member and have a **public** `GOING` RSVP.

## RSVP

- Status: `GOING`, `INTERESTED`, `NOT_GOING`
- Visibility: `PUBLIC` (default) or `PRIVATE`
- Capacity enforced on `maxAttendees`
- First-time `GOING` awards 10 gamification points

## Web

- `/dashboard/youth/events` — event cards + inline RSVP
- `/dashboard/youth/events/[id]` — detail + social proof + attendee list
