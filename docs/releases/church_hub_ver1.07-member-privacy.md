# Church Hub `church_hub_ver1.07`

**Tag:** `church_hub_ver1.07`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Member privacy mode + Field Access GUI + Ministry Cells analytics/export UX + security harden

## Summary

Ships **member privacy mode** for non-Admin/Pastor viewers (Cell Ministers, deputies, Leaders): contact and sensitive profile fields are masked as **Restricted**, with a hardcoded floor that config cannot loosen. Adds complementary **Field Access** editors for church Admin/Pastor and Platform operators (global + per-tenant tighten-only). Includes LEADER/ops **Request access** (notify only), Pastor-gated pastoral notes and bulk PII directory export, Ministry Cells analytics export/Actions UX, and a post-audit security harden pass.

## What’s included

### Member privacy mode (locked policy)
- Ops-visible: identity, status/ministry, city, family **name** only; name-only member search
- Leadership-unmasked: emails, phones, address beyond city, household tree, DOB, socials, notes, customs
- Mask marker: `{ restricted: true, label: "Restricted" }` across cells roster, available-members, family detail, celebrations
- LEADER same masking as cell ops; **Request access** notifies Admin/Pastor (no auto-unmask)

### Capability gates (C)
| Capability | Who |
|---|---|
| Pastoral note content | Pastor only |
| Counseling / confidential care | Pastor only |
| Soft-delete trash / restore | Admin + Pastor |
| Bulk unmasked PII directory export | Pastor only |
| GDPR hard-delete / anonymization | Pastor only (documented gate) |
| Assign ADMIN/PASTOR staff roles | Admin + Pastor |

### Field Access GUI
- Church: **Settings → Field access** (accordion categories; collapsed by default; one open at a time)
- Platform: **Privacy → Field access (global / per tenant)**
- Catalog merge: hardcoded floor → platform global → platform tenant → church (tighten only)
- Custom fields inherit RESTRICTED floor; cross-tenant custom keys rejected on upsert

### Ministry Cells product UX (this cycle)
- Analytics: Actions dropdown (CSV/PDF), email report, DateField, branch comparison, hero renames
- Compact attendance headcount; responsive toolbar; portal preview z-index
- Cell workspace defaults preserved for ministers/deputies

### Security harden (post-audit)
- Sanitize ops create payloads (block ADMIN/PASTOR member roles, notes, DOB, address, customs, `userId`)
- Project create responses for ops
- Mask celebration **age**; family custom/property values
- Strip actor email from activity feed for non-leadership
- Request-access: cell/Leader gate, 3/hr throttle, 15‑min audit dedupe, tenant-scoped `memberId`
- Rate limits on privacy catalog/policy endpoints

### Tests & release notify
- Unit: `member-privacy.service.spec.ts` (10)
- E2E: `e2e/member-privacy-api.spec.ts` (floor, tighten, IDOR, auth)
- `PlatformBroadcast` RELEASE `2026.11.24-member-privacy` (seed script)

## Migrations (apply on deploy)

| Migration | Purpose |
|-----------|---------|
| `20261124120000_member_field_access_privacy` | `MemberFieldAccessPolicy` + visibility/editability enums |

`vps-update.sh` runs `prisma migrate deploy` as part of the normal update.

## Deploy (VPS)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
FORCE_GIT_RESET=1 GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
git fetch --tags
git describe --tags --exact-match HEAD
curl -s http://127.0.0.1:4000/api/v1/health
```

Optional What’s New seed (if not already applied locally):

```bash
cd apps/api && pnpm exec ts-node --transpile-only scripts/seed-member-privacy-release.ts
```

## How to verify

1. Login as Cell Minister / LEADER → branch members show **Restricted** for email/phone
2. Settings → Field access → accordion; tighten city; cannot loosen email floor
3. Platform → Privacy → Field access global/tenant tabs load with `platform.privacy:*`
4. Pastor can open pastoral notes; Admin without PASTOR gets 403
5. Directory export-check requires PASTOR
6. Health `build` matches deployed commit; tag `church_hub_ver1.07`

## Version lineage

| Tag / doc | Notes |
|-----------|--------|
| `church_hub_ver1.05` | Secure password links, WhatsApp dual-send, settings ACL |
| `church_hub_ver1.06` | Establishment + Pipeline Option C (0–8) + security harden |
| `church_hub_ver1.07` | Member privacy + Field Access GUI + cells analytics UX + privacy security harden |
