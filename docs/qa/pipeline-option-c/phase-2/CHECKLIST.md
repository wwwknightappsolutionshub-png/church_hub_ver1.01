# Phase 2 QA Checklist

- [x] Migration `20261122082000_pipeline_option_c_phase2_stage_keys` applied
- [x] `FollowUpStage` Prisma enum removed; stage columns are `text`
- [x] Existing stage values readable (`NEW_LEAD`, etc.)
- [x] SLA/archive helpers derived from pipeline flags
- [x] `updateStage` validates against resolved pipeline
- [x] Archive blocked via `blocksArchive` flag
- [x] Unit suites (Phase 0–2 + archive/SLA/security) pass
- [x] Playwright Phase 2 + Phase 1 + establishment regression pass
- [x] Proof in this folder + **GO / NO-GO**
