# Pipeline Option C — agent / developer scope note

## What Option C is

Membership journey stages are **data**: system templates (`PipelineTemplate`) and optional church forks (`PipelineDefinition`). Runtime UI and API **resolve** the active pipeline instead of hardcoding stage lists.

## Source of truth

| Layer | Source |
|-------|--------|
| Product defaults | `pipeline-template.seed.ts` (`winners_default`, `simple_visitor`) |
| Church customize | `POST /follow-up/pipeline/fork` + stage PATCH/POST |
| Runtime read | `GET /follow-up/pipeline` → `PipelineResolveService` |
| Web bind | `usePipelineDefinition()` + `@/lib/pipeline-definition` helpers |

## Do / don’t

**Do**

- Drive labels, order, badges, next-stage, archive/SLA flags from the resolved pipeline.
- Keep static maps in `apps/web/lib/follow-up.ts` only as **load fallbacks** while resolve is empty.
- Prefer stage **flags** (`isEntry`, `blocksArchive`, `graduatesSla`) over `stage === 'JOINED_GROUP'`.
- Call `ensureSystemPipelineTemplates` for seed/bootstrap; do **not** overwrite bumped template stage labels on update (Phase 7).

**Don’t**

- Invent new stage keys mid-feature without updating seed + docs.
- Hardcode Establishment filter tabs or worker graduated sets to winners-only keys.
- Reintroduce Prisma enums for `FollowUp.stage` (string keys).
- Expand scope into Phase 7+ merge UX changes unless asked — Option C phases 0–8 are complete when QA says so.

## Key API surfaces

- `GET /follow-up/pipeline` — resolve
- `GET|PUT` templates / base-template — Phase 6
- `POST` fork / discard / stages — Phase 5
- `GET` updates · `POST` merge · dismiss · bump — Phase 7
- `POST /follow-up/pipeline/templates/:key/resync` · `…/bump` — QA only (`PIPELINE_QA_TOOLS=true`, hard-blocked in production); shared templates
- Church `PATCH …/stages/:key` — labels only (`label` / `shortLabel`)

## QA proof

Phase gates and logs live under `docs/qa/pipeline-option-c/phase-N/`.  
Admin how-to: `docs/membership/pipeline-option-c-admin.md`.
