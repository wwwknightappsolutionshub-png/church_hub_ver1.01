# Phase 0 QA Checklist

- [x] Baseline snapshot written (`BASELINE.md`)
- [x] Phase 0 baseline unit lock passes (`pipeline-option-c-phase0-baseline.spec.ts`)
- [x] Follow-up API unit/integration suite passes (`api-unit.log` — 26/26)
- [x] Playwright `follow-up-api.spec.ts` passes (chromium)
- [x] Playwright `establishment-phase5-api.spec.ts` passes (chromium)
- [x] Playwright `follow-up.spec.ts` passes (chromium; mobile noted as residual risk)
- [x] DB: Prisma schema valid; enum `FollowUpStage` has 6 values (`db-validate.log`, `db-enum.json`)
- [x] Proof logs saved in this folder
- [x] Explicit **GO** for Phase 1 in `GO-NO-GO.md`

**No-go if:** any baseline suite fails, or product/schema was changed in this phase.  
→ Suites green; only test-hygiene fixes for current product (GDPR, access mocks). **GO.**
