# Phase 7 QA Checklist

- [x] Template `version` + definition `forkedFromVersion` drive “updates available”
- [x] `GET /follow-up/pipeline/updates` returns diff (added / removed / changed / custom / conflicts)
- [x] `POST /follow-up/pipeline/merge` adds stages, preserves custom, resolves conflicts
- [x] `POST /follow-up/pipeline/updates/dismiss` until next bump
- [x] `POST /follow-up/pipeline/templates/:key/bump` for product updates / QA
- [x] Settings Updates panel + diff view + Merge / Dismiss
- [x] ensure*() no longer clobbers bumped template stage labels
- [x] Playwright API (happy path + conflict) + UI + screenshot
- [x] Proof + **GO / NO-GO**
