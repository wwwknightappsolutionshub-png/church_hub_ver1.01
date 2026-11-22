# Pipeline Option C — QA index

Customizable membership pipelines (templates → resolve → fork → multi-template → diff/merge).

| Phase | Focus | Decision |
|-------|--------|----------|
| [0](./phase-0/) | Baseline lock | GO |
| [1](./phase-1/) | Schema / seed / resolve | GO |
| [2](./phase-2/) | String stage keys + flags | GO |
| [3](./phase-3/) | Establishment UI bind | GO |
| [4](./phase-4/) | Outreach / worker hardcoding out | GO |
| [5](./phase-5/) | Fork + rename + add stage | GO |
| [6](./phase-6/) | Extra templates + picker | GO |
| [7](./phase-7/) | Versioning + diff / merge | GO |
| [8](./phase-8/) | Docs, polish, full regression | GO |

## Docs

- Admin: [`docs/membership/pipeline-option-c-admin.md`](../../membership/pipeline-option-c-admin.md)
- Agent/dev: [`docs/dev/pipeline-option-c-agent.md`](../../dev/pipeline-option-c-agent.md)

## Regression command (Phase 8)

From `apps/web` (API on `:4000`, web on `:3001`, JWT mint env loaded):

```powershell
pnpm exec playwright test `
  e2e/pipeline-option-c-phase1-api.spec.ts `
  e2e/pipeline-option-c-phase2-api.spec.ts `
  e2e/pipeline-option-c-phase3-ui.spec.ts `
  e2e/pipeline-option-c-phase4-api.spec.ts `
  e2e/pipeline-option-c-phase4-ui.spec.ts `
  e2e/pipeline-option-c-phase5-api.spec.ts `
  e2e/pipeline-option-c-phase5-ui.spec.ts `
  e2e/pipeline-option-c-phase6-api.spec.ts `
  e2e/pipeline-option-c-phase6-ui.spec.ts `
  e2e/pipeline-option-c-phase7-api.spec.ts `
  e2e/pipeline-option-c-phase7-ui.spec.ts `
  e2e/establishment-phase5-api.spec.ts `
  --project=chromium --workers=1 --reporter=list
```

API unit pattern: `pipeline-option-c-phase`
