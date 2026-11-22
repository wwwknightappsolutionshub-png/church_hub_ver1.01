# Phase 2 Summary — Pipeline Option C

Backend stage keys + flags:

- Storage is string keys (no Prisma enum)
- SLA / archive / retention use `graduatesSla` / `blocksArchive`
- Stage mutations validated against `GET`-equivalent resolve payload

Next: **Phase 3** — Establishment UI reads resolved pipeline (tabs, labels, colors).
