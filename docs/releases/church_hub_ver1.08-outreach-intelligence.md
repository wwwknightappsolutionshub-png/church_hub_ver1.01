# church_hub_ver1.08 — Outreach Intelligence

**Tag:** `church_hub_ver1.08`

## Outreach (A1–A5)

- **Campaigns** — CRUD, optional on capture, default campaign for QR.
- **Dedupe** — Block duplicate active Establishment journeys; leader override + audit.
- **Command centre** — Source, handoff, stuck flags; link to Establishment.
- **Team scorecard** — Captures, QR, handoff, 72h first progress by evangelist.
- **Territory map** — Geo-tagged captures (leaders).

## Migration

`20261124180000_outreach_campaigns_intelligence`

## Verify

1. Create campaign → capture with campaign → command centre row.
2. Duplicate phone → blocked; Pastor override works.
3. Scorecard + map visible to Admin/Pastor/Leader only.