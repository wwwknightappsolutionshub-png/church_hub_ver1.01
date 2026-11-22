# Phase 5 QA Checklist

- [x] `POST /follow-up/pipeline/fork` clones template → church definition (idempotent)
- [x] `PATCH /follow-up/pipeline` renames definition
- [x] `PATCH /follow-up/pipeline/stages/:key` renames labels / updates flags
- [x] `POST /follow-up/pipeline/stages` adds UPPER_SNAKE_CASE custom key
- [x] Guards: one entry stage; reject invalid keys; no silent lowercase
- [x] Resolve returns `source: definition` after fork
- [x] Settings → Membership Pipeline admin UI (preview / customize / edit / add)
- [x] Establishment tabs show renamed labels after fork
- [x] Playwright Phase 5 + Phase 4 regression pass
- [x] Proof + **GO / NO-GO**
