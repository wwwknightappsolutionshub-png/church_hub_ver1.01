# church_hub_ver1.10 — Service unit hub and server sessions

**Tag:** `church_hub_ver1.10`  
**Branch:** `feat/pwa-install-gate-mobile`

## Service unit hub

- Attendance tab removed from the service unit hub.
- Leader, assistant, and secretary share one tab strip. Connect With Admin is officer-only.
- Department roll call shows the unit name, uses Mark Attendance, and loads stats for units that are not a Phase 8 department code.
- Weekly report failures say what to do next instead of a generic toast.
- Meetings, dates, and dropdowns use the app calendar and menu.

## Testimony

- The testimony headline is sent as `subject`, so a filled subject is no longer rejected as required.

## Sessions

- Logout waits for the server to revoke the session. Access tokens are checked against that session on each request.
- Access tokens last at most 15 minutes. Refresh tokens last at most 12 hours.
- A password change revokes every device and unused magic sign-in links.
- Magic sign-in links expire in 5 minutes, work once, and are stored as a SHA-256 hash.

## Prayer board

- Prayer requests can stay off the public board. Existing rows stay board-eligible (`showOnBoard` defaults to true).

## Deploy

```bash
cd /www/wwwroot/church-hub.wazconnect.com
git fetch origin
git reset --hard origin/feat/pwa-install-gate-mobile
GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
```

Confirm `GET /api/v1/health` `build` matches `git rev-parse --short HEAD` after deploy. Apply the prayer-board migration with the usual Prisma migrate step in that script.
