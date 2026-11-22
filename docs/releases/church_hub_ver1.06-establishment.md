# Church Hub `church_hub_ver1.06`

**Tag:** `church_hub_ver1.06`  
**Branch:** `feat/pwa-install-gate-mobile`  
**Theme:** Establishment module + Pipeline Option C (templates → fork → multi-template → diff/merge) + QA/security harden

## Summary

Splits field **Outreach** from the **Establishment** membership pipeline, then delivers **Pipeline Option C** end-to-end: system templates, resolve API, church fork/customize, extra templates, versioned diff/merge, docs/regression, and security locks on shared-template QA tools and stage policy flags.

## What’s included

### Establishment (Phases 1–5)
- `/dashboard/establishment` primary surface; permanent redirect from `/dashboard/follow-up`
- Access modes: `manager` | `worker` | `viewOnly` | `wsfLeader` | `none`
- Worker dashboard, assignment notify (`FOLLOW_UP_ASSIGNED`), stage audit
- Playwright: establishment journey + redirects

### Pipeline Option C (Phases 0–8)
- Schema/seed: `PipelineTemplate` / `PipelineDefinition` / string stage keys
- Resolve: `GET /follow-up/pipeline` drives Establishment UI
- Fork + rename + add stage; template picker (`winners_default`, `simple_visitor`)
- Diff/merge/dismiss; Settings Membership Pipeline + Updates panel
- Docs: admin how-to + agent note; full regression GO

### Security harden
- `bump` / `resync` require `PIPELINE_QA_TOOLS=true` (shared templates; never enable in production)
- Church stage patch cannot change `blocksArchive` / `graduatesSla`
- Stage key + phase field validation

## Migrations (apply on deploy)

| Migration | Purpose |
|-----------|---------|
| `20261122023000_follow_up_wsf_branch` | `FollowUp.wsfCellBranchId` |
| `20261122024000_follow_up_stage_audit` | `FollowUpStageAudit` |
| `20261122043000_follow_up_assignment_sla` | Assignment SLA fields |
| `20261122050000_follow_up_last_progress` | Last progress tracking |
| `20261122064000_outreach_gdpr_consent` | Outreach GDPR consent |
| `20261122081000_pipeline_option_c_phase1` | Pipeline templates/definitions |
| `20261122082000_pipeline_option_c_phase2_stage_keys` | String stage keys |

`vps-update.sh` runs `prisma migrate deploy` as part of the normal update.

## Deploy (VPS)

```bash
cd /www/wwwroot/church-hub.wazconnect.com
FORCE_GIT_RESET=1 GIT_BRANCH=feat/pwa-install-gate-mobile ./scripts/deploy/vps-update.sh
./scripts/deploy/vps-verify.sh
curl -s http://127.0.0.1:4000/api/v1/health
git rev-parse --short HEAD && git describe --tags --exact-match 2>/dev/null || true
```

**Do not** set `PIPELINE_QA_TOOLS=true` on production.

## How to verify

See **[establishment-smoke-checklist.md](./establishment-smoke-checklist.md)** and Option C QA under `docs/qa/pipeline-option-c/`.

## Version lineage

| Tag / doc | Notes |
|-----------|--------|
| `church_hub_ver1.05` | Secure password links, WhatsApp dual-send, settings ACL |
| `church_hub_ver1.06` | Establishment + Pipeline Option C (0–8) + security harden |
