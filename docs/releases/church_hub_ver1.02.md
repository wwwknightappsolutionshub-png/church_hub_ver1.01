# Church Hub `church_hub_ver1.02`

**Tag:** `church_hub_ver1.02`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Church Staff → unit leader assignment (unit-scoped access)

## Summary

Admins/pastors can assign staff as **unit leaders** from **Church Staff**. Unit-only `LEADER` accounts get unit-scoped module access only — not church-wide staff tools.

## What’s included

- Create/update church staff with `serviceUnitIds` (required for unit-only `LEADER`)
- Syncs `ServiceUnitLeader` (`isUnitAdmin`) + unit membership
- Staff UI: multi-select “Leads service units”; list shows units led
- Security tighten: create service units = ADMIN/PASTOR only; update unit = staff or that unit’s admin
- E2E: Nest HTTP integration + Playwright API suites for assign / revoke / forbid / cross-church / scoped access

## Deploy (VPS)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
FORCE_GIT_RESET=1 GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
```

Verify tag on the server after pull:

```bash
git fetch --tags
git describe --tags --exact-match HEAD 2>/dev/null || git log -1 --oneline
curl -s http://127.0.0.1:4000/api/v1/health
```

Expect health `build` to match the tagged commit short SHA.

## How to verify in product

1. Sign in as church ADMIN/PASTOR → **Church Staff**
2. Add staff with role **LEADER** (no ADMIN/PASTOR) and select ≥1 service unit
3. Sign in as that leader → no Church Staff admin nav; can manage only assigned unit(s)
4. Reassign/revoke units from Church Staff; demote to MEMBER clears unit-admin leadership

## Related tests

```bash
# API package
pnpm --filter @church-hub/api exec jest --config test/jest-e2e.json --runInBand --forceExit --testPathPattern=church-staff-unit-leader

# Web (API must be running; load API .env for 2FA mint)
pnpm --filter @church-hub/web exec playwright test e2e/church-staff-unit-leader-api.spec.ts --project=chromium
```

## Version lineage

| Tag | Notes |
|-----|--------|
| `church_hub_ver1.01` | Production remote / prior VPS baseline |
| `church_hub_ver1.02` | Unit leader assignment from Church Staff + e2e |
