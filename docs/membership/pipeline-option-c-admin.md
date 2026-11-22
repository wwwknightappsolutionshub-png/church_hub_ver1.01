# Membership Pipeline (Option C) — Admin how-to

Church Admin and Pastor can customize the Establishment membership journey without changing product code.

## Where to manage it

**Settings → Membership Pipeline** (`/dashboard/settings/membership-pipeline`)

Requires Admin or Pastor. Follow-up module access is also required.

## Concepts

| Term | Meaning |
|------|---------|
| **System template** | Shared product journey (`winners_default` or `simple_visitor`) |
| **Church definition** | Your forked copy — labels and stages you edit |
| **Resolve** | What Establishment shows: active definition if present, else preferred template |

## Typical flows

### 1. Pick a base template (before customize)

1. Open Membership Pipeline while still on a system template.
2. Choose **Winners Chapel Default** (6 stages) or **Simple Visitor** (4 stages).
3. Establishment stage tabs update immediately.

### 2. Customize (fork)

1. Click **Customize pipeline**.
2. The church now owns a definition (`source: definition`).
3. Rename the definition, rename stage labels, or **Add stage** (key must be `UPPER_SNAKE_CASE`).

Keys stay stable for contacts already in a stage — rename the label, not the key, when you only want different wording.

### 3. Discard fork

**Discard fork** returns to the system template so you can pick a different base. Contact stage keys already stored are unchanged; tabs follow the selected template again.

### 4. Template updates (after fork)

When product bumps a system template version:

1. Settings shows **Updates available**.
2. **View diff** — added / removed / changed / custom stages.
3. For conflicts (you and the template both changed the same stage), choose **Keep church** or **Take template**.
4. **Merge updates** applies the merge, or **Dismiss** hides the notice until the next bump.

Custom stages you added are preserved on merge.

## Repair / QA: resync / bump system templates

`bump` and `resync` mutate **shared** system templates (affects every church). They are **disabled by default**.

Enable only for local/QA tooling (`NODE_ENV` must not be `production`):

```text
PIPELINE_QA_TOOLS=true
```

Then:

- `POST /follow-up/pipeline/templates/:key/resync` — restore seed (version → 1, prune extras)
- `POST /follow-up/pipeline/templates/:key/bump` — product update simulation

In **production**, bump/resync are always rejected (even if `PIPELINE_QA_TOOLS=true` is mis-set). Do not enable the flag on production. Church customize (fork / rename / add stage / merge) does not need this flag.

## Guardrails

- Exactly one **entry** stage (where new captures land).
- Cannot switch base template while a church definition is active — discard first.
- Stage keys must be `UPPER_SNAKE_CASE` (2–48 characters).
- Church stage PATCH accepts **labels only** (`label` / `shortLabel`); structure, entry, enablement, and policy flags (`blocksArchive` / `graduatesSla`) are rejected.

## Related screens

- **Establishment** — Membership Pipeline / Contact Directory / worker views use the resolved journey.
- **Outreach capture** — new contacts enter at the resolved entry stage.
