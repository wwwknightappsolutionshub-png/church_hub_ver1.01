# Church Hub `church_hub_ver1.04`

**Tag:** `church_hub_ver1.04`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Service Unit create wizard + deputy leadership + WSF Assistants + security harden

## Summary

Ships multi-step New Unit setup (members + optional Unit Admin), Assistant/Secretary deputies for Service Units and Ministry/Cells (WSF), unit-admin/deputy login landing on the unit hub (not Lounge), Excel/CSV member import, and critical security fixes (cross-tenant unit IDOR, mass-assignment, forum author spoofing, XLSX bounds).

## What’s included

### Service Unit Hub
- **Create Unit wizard** (`POST /service-units/with-setup`): unit details → optional members (roster / new / CSV·XLSX) → optional Unit Admin → preview
- **Skip members** / **Skip leader** supported; empty unit allowed
- Member import template + preview; native **.xlsx** parse via exceljs (legacy `.xls` rejected; zip ratio / size / row caps)
- Overview: **Add Leader** (church staff) / **Assign Assistants** (Unit Admin); Admin tab is view + pointer only
- Deputies (`ASSISTANT` / `SECRETARY`) operate the unit but cannot assign Unit Admin

### Login / navigation
- Unit Admin and deputies land on `/dashboard/service-units/:id` (or hub list), not Lounge
- Dashboard shell + `/dashboard` redirect use `unitAdminUnitIds` + `unitDeputyUnitIds`

### Ministry / Cells (WSF)
- `CellLeadershipDeputy` model + migration `20261121210000_cell_leadership_deputies`
- Branch/province Assistant & Secretary assign/remove APIs
- Deputy candidates endpoints gated by assign rights
- Overview UI: Assign Assistants panel (primary leader or church staff)

### Security (reviewed)
- Cross-tenant IDOR: `requireUnitManager` binds `getUnit(churchId, id)` before ACL
- Strict `UpdateServiceUnitDto` (no mass-assignment of `churchId` / etc.)
- Forum posts/replies: author from session; pin/lock requires real moderator
- Meeting summary cannot be published as another member
- XLSX safety checks before ExcelJS expansion

### Tests / e2e
- with-setup DTO + rollback specs; tenant/security specs; deputy ACL specs
- Playwright: create-unit wizard; unit-leader home expects Service Unit Hub (not Lounge)

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

Expect health `build` to match the tagged commit short SHA. Migration applies `cell_leadership_deputies`.

## How to verify in product

1. **New Unit** — wizard: skip members + skip leader → unit appears on list with toast  
2. **Import** — upload CSV or .xlsx with First/Last Name columns  
3. **Unit Leader login** — lands on unit hub, not Lounge; staff page redirects away  
4. **Assign Assistants** — Unit Admin assigns Assistant/Secretary from Overview  
5. **WSF** — primary cell/province leader assigns Assistant/Secretary; deputy cannot assign  
6. **Security** — staff of church A cannot PATCH a unit UUID belonging to church B

## Version lineage

| Tag | Notes |
|-----|--------|
| `church_hub_ver1.01` | Production remote / prior VPS baseline |
| `church_hub_ver1.02` | Unit leader assignment from Church Staff + e2e |
| `church_hub_ver1.03` | Unit Hub delete/search, staff wizard, one-unit rule, secure invites |
| `church_hub_ver1.04` | Create-unit wizard, deputies (SU + WSF), Excel import, security harden |
