# Church Hub `church_hub_ver1.03`

**Tag:** `church_hub_ver1.03`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Service Unit Hub ops + Church Staff invite wizard (secure, one-unit leadership)

## Summary

Hardens Service Unit Hub administration and Church Staff onboarding: unit delete with Uncategorized reassignment, unit search/autosuggest, Unit Leader assign/remove from Unit admin, multi-step staff access wizard, and security fixes (one unit per leader, set-password invites, gated meetings APIs).

## What’s included

### Service Unit Hub
- Soft-delete unit → members and hub data move to **Uncategorized**; Uncategorized cannot be deleted
- Transactional reassign + conflict-safe dept row moves (move-or-drop on unique keys)
- List search + admin autosuggest (`GET /service-units/suggest`)
- Unit admin: assign/remove **Unit Leaders** (all units); enforces one active unit-admin role per member
- Meetings + welcome email template endpoints require unit view/manage

### Church Staff
- Multi-step **Add staff** wizard: details → access type (with capability copy) → single service unit
- Access types: Admin, Unit Leader, Church Pastor, Provincial WSF Leader, WSF Leader, Bus Coordinator, Leader
- Max **one** led service unit per staff account (API + shared-types validation)
- Legacy multi-unit leadership healed on staff list (keep earliest assignment)
- Welcome email uses **set-password link** (48h) — no plaintext password in email
- `mustChangePassword` on create; cleared when admin sets password on update

### UX / tabs
- Shared `SectionTabNav` wrapping (no horizontal scroll) across module tab bars

## Deploy (VPS)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
FORCE_GIT_RESET=1 GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
```

Verify tag after deploy:

```bash
git fetch --tags
git describe --tags --exact-match HEAD 2>/dev/null || git log -1 --oneline
curl -s http://127.0.0.1:4000/api/v1/health
```

Expect health `build` to match the tagged commit short SHA.

## How to verify in product

1. **Service Unit Hub** — search units; delete a unit with members → appear under Uncategorized  
2. **Unit admin** — assign/remove a Unit Leader; cannot assign someone who already leads another unit  
3. **Church Staff → Add staff** — multi-step wizard; Unit Leader requires exactly one unit; invite email has set-password link  
4. Sign in as new staff after setting password via link

## Version lineage

| Tag | Notes |
|-----|--------|
| `church_hub_ver1.01` | Production remote / prior VPS baseline |
| `church_hub_ver1.02` | Unit leader assignment from Church Staff + e2e |
| `church_hub_ver1.03` | Unit Hub delete/search, staff wizard, one-unit rule, secure invites, API harden |
