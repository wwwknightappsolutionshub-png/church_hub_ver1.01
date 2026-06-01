# Phase 9 — Automation layer

Production orchestration for membership workflows. All jobs are **fail-safe** (per-church toggles, attempt limits on sync, audit logs) and **documented** here.

## Workflows (outline compliance)

| Workflow | Schedule | API |
|----------|----------|-----|
| **Weekly workflows** | Monday (6h tick) + manual | `POST /automation/weekly` |
| **Absentee triggers** | Daily 6h + manual | `POST /automation/run/ABSENTEE_TRIGGER` |
| **First-timer triggers** | Daily + weekly bundle | `POST /automation/run/FIRST_TIMER_TRIGGER` |
| **New convert triggers** | Daily + weekly bundle | `POST /automation/run/NEW_CONVERT_TRIGGER` |
| **Follow-up reminders** | 60s (existing scheduler) + daily pass | `POST /automation/run/FOLLOW_UP_REMINDER` |
| **Pastoral alerts** | Daily + weekly | `POST /automation/run/PASTORAL_ALERT` |
| **Intelligent recommendations** | Weekly bundle | `GET /automation/recommendations` |
| **Background sync engine** | 60s global | `POST /automation/sync/process` |

## Hub

- **Web:** `/dashboard/automation` — toggles, manual runs, recommendations, run log
- **API:** `GET /automation/status`, `PATCH /automation/settings`, `GET /automation/runs`

## Sync entity types

- `OUTREACH_CAPTURE` — field evangelism payloads
- `ATTENDANCE_BULK` — offline service/department roll calls (`scope`, `entries`, `serviceDate`, …)

## Audit

`AutomationRunLog` records every workflow execution with `SUCCESS` | `PARTIAL` | `FAILED` | `SKIPPED`.

## Environment

- `MEMBERSHIP_AUTOMATION_ENABLED=false` — disables the Phase 9 scheduler (communications queue scheduler remains).

## Tests

- `test/phase9-automation.integration-spec.ts`
