# Phase 4 Summary — Pipeline Option C

Remaining Establishment/Outreach hardcoding removed for convert, worker chrome, and exports:

- Outreach capture lands on resolved entry stage; convert syncs follow-up via stage flags
- Worker / view-only / detail / calendar / archived bind to `GET /follow-up/pipeline`
- PDF export scopes use resolved phases and labels

Static `FOLLOW_UP_STAGES` remains only as a load fallback.

Next: **Phase 5** — church-level pipeline definition fork / admin editing UX.
