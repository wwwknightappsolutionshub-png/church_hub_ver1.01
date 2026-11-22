# Church Hub `church_hub_ver1.05`

**Tag:** `church_hub_ver1.05`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Secure password links, WhatsApp dual-send (no bearer URLs), settings ACL, unit hub membership highlight

## Summary

Hardens set-password / reset flows (45‑minute one-time links, strong passwords, atomic consume, resend controls), dual-sends transactional notices over WhatsApp without putting bearer tokens on WhatsApp, restricts Settings privacy/session cards to Church Admin & Pastor, and highlights the user’s own service units in the Service Unit Hub.

## What’s included

### Password / auth links
- **45‑minute TTL** for reset, magic, and staff/unit-leader set-password invites (copy updated from 48 hours)
- **Strong passwords:** 12+ with upper, lower, number, and special (shared `passwordSchema`)
- **Reset page:** countdown timer, validate API, “Request a new link” modal + resend
- **Security harden:**
  - Atomic token consume (no TOCTOU replay on parallel reset/magic consume)
  - Password reset consume + password update + refresh revoke in one transaction
  - Validate returns only `valid` | `unusable` (no used/expired fingerprinting)
  - Per-user resend rate limit + tighter IP throttle
  - Login failures stay generic (no `resetLinkSent` enumeration)
  - Auth logs redact tokens/OTPs
  - `Referrer-Policy: no-referrer` on auth pages

### WhatsApp dual-send
- New `trySendWhatsApp` helper for best-effort sends when phone exists
- Auth / staff / unit-leader / landing / follow-up / digests / queue automations dual-notify where channels allow
- **Bearer URLs stay email-only** — WhatsApp gets “check your email” notices for reset/setup/magic links (unverified-phone risk)

### Settings ACL
- **Privacy & data** and **Session** visible to **Church Admin** and **Church Pastor** only
- **Your profile** remains editable for all signed-in users
- Membership profile card still gated by `canAccessMyProfile`

### Service Unit Hub
- Units the user belongs to (member, unit admin, or deputy) get a vivid amber highlight + **“You Belong To This Unit”**
- Belonging units sort to the top of the hub grid

## Deploy (VPS)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
FORCE_GIT_RESET=1 GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
```

Verify tag after deploy:

```bash
git fetch --tags --force
git describe --tags --exact-match HEAD 2>/dev/null || git log -1 --oneline
curl -s http://127.0.0.1:4000/api/v1/health
```

Expect health `build` to match the tagged commit short SHA. No new Prisma migrations in this release.

## How to verify in product

1. **Set-password email** — link expires in 45 minutes; countdown on `/reset-password`; after expiry, Request a new link works
2. **Strong password** — weak passwords rejected on reset (API + UI)
3. **WhatsApp** — with phone + gateway: welcome/reset flows notify WhatsApp **without** pasting the token URL
4. **Settings as Member** — no Privacy & data / Session cards; profile still editable
5. **Settings as Admin/Pastor** — Privacy & data + Session visible
6. **Service Unit Hub** — assigned unit card highlighted with “You Belong To This Unit”

## Version lineage

| Tag | Notes |
|-----|--------|
| `church_hub_ver1.01` | Production remote / prior VPS baseline |
| `church_hub_ver1.02` | Unit leader assignment from Church Staff + e2e |
| `church_hub_ver1.03` | Unit Hub delete/search, staff wizard, one-unit rule, secure invites |
| `church_hub_ver1.04` | Create-unit wizard, deputies (SU + WSF), Excel import, security harden |
| `church_hub_ver1.05` | Secure password links, WhatsApp dual-send (no bearer URLs), settings ACL, unit hub highlight |
