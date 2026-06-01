# Phase 4 — Youth Chat (Discord/Slack style)

## API (`/api/v1/youth/chat`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/channels` | Youth channels list |
| POST | `/channels` | Create channel (leaders) |
| POST | `/channels/:id/join` | Join channel membership |
| GET | `/channels/:id/messages` | Messages + reactions |
| POST | `/channels/:id/messages` | Send (WS broadcast) |
| POST | `/channels/:id/read` | Read receipts |
| POST | `/messages/:id/reactions` | Toggle emoji reaction |
| PATCH | `/messages/:id/moderate` | Hide/show (leaders) |
| GET | `/messages/flagged` | Moderation queue |
| GET | `/dm/threads` | DM inbox |
| GET | `/dm/:peerMemberId/messages` | DM history |
| POST | `/dm/:peerMemberId/messages` | Send DM (WS + notification) |

**Legacy paths** under `/youth/channels` still work (delegate to `YouthChatService`).

## WebSocket (`/realtime`)

| Client → Server | Server → Client |
|-----------------|-----------------|
| `join-youth-channel` | `youth:message` |
| `leave-youth-channel` | `youth:reaction` |
| `join-youth-dm` | `youth:dm` |
| `youth-typing` | `youth:read` |
| | `youth:notification` |

Rooms: `youth-channel:{id}`, `youth-dm:{threadKey}`

## Moderation

- `scanContentForModeration` on channel + DM send
- Auto-hide flagged channel messages
- Block flagged DMs

## Notifications

- `Notification.type = YOUTH_CHAT`
- DM recipient notified
- `@uuid` mention pattern notifies user

## Web

- `/dashboard/youth/chat` — `YouthChatPanel`
- Hook: `useYouthChatRealtime`
- Hub tab re-exports same panel

## Schema

- `YouthMessageReaction` — message emoji reactions
- Existing: `Message`, `ChatChannel`, `YouthChannelMember`, `YouthMessageReadReceipt`, `YouthDirectMessage`
