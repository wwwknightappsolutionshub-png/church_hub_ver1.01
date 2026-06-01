# Phase 1 — Locked product decisions

Confirmed **2026-05-29**. All later phases must align with these defaults.

## Scope

12 membership modules + department layer (service units) + automation layer, as defined in the Church Membership Management System spec.

## Locked decisions

| # | Topic | Decision |
|---|--------|----------|
| 1 | **Membership classes (101–401)** | **Configurable per church.** Each tenant defines class levels (default codes 101, 201, 301, 401). Stored in `MembershipClassDefinition`. |
| 2 | **Super admin** | Maps to existing **`PLATFORM_ADMIN`** (SaaS platform owner). Church `ADMIN` remains church-level only. |
| 3 | **Department head** | Continue **`ServiceUnitLeader`** with unit role **`UNIT ADMIN`** (no new global `DEPARTMENT_HEAD` role). |
| 4 | **Phone messaging** | **WhatsApp only** for SMS-style outbound. Email + in-app remain. No Twilio/SMS channel in production paths. |
| 5 | **Sunday / service attendance** | **Fixed service catalog per church** via `ChurchService` records (name, schedule, sort order). Attendance links to `churchServiceId`. |

## RBAC summary

| Role | Scope |
|------|--------|
| `PLATFORM_ADMIN` | Multi-tenant SaaS console |
| `ADMIN` / `PASTOR` | Church leadership dashboard |
| `ServiceUnitLeader` (`UNIT ADMIN`) | Department/ministry unit |
| `LEADER` / `MEMBER` | Member portal gates |

## Phase 2 foundation (complete)

- Prisma: `ChurchService`, `MembershipClassDefinition`
- API: `/membership/church-services`, `/membership/class-definitions`
- Notifications: WhatsApp-only adapter for phone channels
- Web: app-wide PWA registration, root error boundary, JWT refresh interceptor

## Phase 3 core modules 1–5 (complete)

| Module | API | Web |
|--------|-----|-----|
| 1 Member profile | Activity logs on CRUD; existing profile + detail | Member detail + edit |
| 2 Family linking | `GET/PATCH /families/:id`, create with audit | **Families** tab |
| 3 Membership classes | `class-enrollments` CRUD | **Classes** tab |
| 4 Attendance | `attendance`, `attendance/bulk`, summaries | **Attendance** tab (service roll) |
| 5 Service history | `GET /members/:id/timeline` | **Service history** tab on member |

Prisma: `MemberActivityLog`, `ClassEnrollment`, `AttendanceRecord`

## Phase 4 follow-up, counseling & pastoral care (complete)

| Module | API | Web |
|--------|-----|-----|
| 6 Follow-up automation | Rules, scheduler, delayed triggers, notification queue, WhatsApp default | `FollowUpAutomationPanel` on Follow-Up |
| 7 Counseling & prayer | `/pastoral-care/cases`, `/sessions`, `/prayer-requests` | Pastoral Care hub (cases, prayer, session log) |
| 8 Pastoral notes | `/pastoral-care/notes` (RBAC + confidential filter) | Notes tab list + follow-up panel |

**Tests:** `follow-up-automation.service.spec.ts`, `pastoral-care.service.spec.ts`, `test/phase4-pastoral.integration-spec.ts`

## Phase 5 analytics & growth trends (complete)

| Module | API | Web |
|--------|-----|-----|
| 9 Growth trends | `GET /membership/analytics/growth-trends` | Member growth, converts, first-timer retention charts |
| 10 Analytics dashboard | `GET /membership/analytics` | `/dashboard/analytics` — absentee, attendance, departments, follow-up |

**Charts (outline):** absentee trends · department performance · first-timer retention · new convert growth · attendance performance · follow-up completeness. **No giving/financial metrics.**

**Tests:** `membership-analytics.util.spec.ts`, `test/phase5-analytics.integration-spec.ts`

## Phase 6 outreach & evangelism (complete)

| Feature | API | Web |
|---------|-----|-----|
| Outdoor field capture | `POST /outreach/capture` (GPS, photo, offline sync) | `/dashboard/outreach/field` |
| Voice-to-text notes | `voiceNotes` on capture | `VoiceNotesField` |
| Convert pipeline | `GET /outreach/pipeline`, `PATCH .../pipeline` | `ConvertPipelinePanel` |
| Follow-up linkage | Auto `followUpId` on capture | Pipeline + follow-up board |
| Bus pickup needs | `needsBusPickup` → ride on convert | Capture checkbox |
| Convert-to-member | `POST /contacts/:id/convert-to-member` | Pipeline + contacts list |

**Tests:** `outreach-pipeline.service.spec.ts`, `test/phase6-outreach.integration-spec.ts`

## Phase 7 communication system (complete)

| Feature | API | Web |
|---------|-----|-----|
| Notification queue | `GET/POST /communications/queue`, scheduler 60s | **Notification Queue** tab |
| Conversations | `/communications/conversations/*` | **Conversations** tab |
| Department broadcasts | `POST /communications/broadcast/department` | Automations panel |
| Absentee auto-message | `POST /communications/automation/absentee-followup` | Automations panel |
| Service reminders | `POST /communications/automation/service-reminders` | Automations panel |
| In-app + email + WhatsApp | Queue channels `IN_APP`, `EMAIL`, `WHATSAPP` | Channel checkboxes |

**Tests:** `communications-queue.service.spec.ts`, `test/phase7-communications.integration-spec.ts`

## Phase 8 department tools (complete)

| Feature | API | Web |
|---------|-----|-----|
| Phase 8 department list | `GET /service-units/departments` | `/dashboard/departments` hub |
| Attendance dashboard | `GET .../departments/:id/dashboard` | **Department** tab on unit detail |
| Department roll call | `POST .../departments/:id/attendance/bulk` (`DEPARTMENT` scope) | Roll call UI in dashboard panel |
| Absentee notifier (email + in-app) | `POST .../departments/:id/notify-absentees` | Notify absentees button |
| Weekly report to admin/pastor | `POST .../departments/:id/weekly-reports/generate` | Weekly report button + history |
| Volunteer consistency | Dashboard `volunteerConsistency` | Consistency list in panel |
| Unit heads | Existing `ServiceUnitLeader` + `isUnitAdmin` | Unit admin tab unchanged |

**Departments:** Ushering, Choir, Evangelism (Harvesters), Youth, Teens, Children, Protocol, Prayer, Media — via `DepartmentCode` on `ServiceUnit`.

**Scheduler:** Monday weekly reports (`ServiceUnitsDepartmentScheduler`).

**Tests:** `service-units-department.util.spec.ts`, `test/phase8-departments.integration-spec.ts`

## Phase 9 automation layer (complete)

| Workflow | Implementation |
|----------|----------------|
| Weekly workflows | `POST /automation/weekly` — absentee, reminders, first-timer, convert, pastoral, recommendations, Monday department reports |
| Absentee triggers | Delegates to Phase 7 `runAbsenteeFollowUp` |
| First-timer & new convert triggers | `FIRST_TIMER_WELCOME` / `NEW_CONVERT_WELCOME` queue items |
| Follow-up reminders | `FollowUpAutomationService.processOverdueRules` + due reminder counts |
| Intelligent recommendations | Analytics-driven tips → `GET /automation/recommendations` |
| Pastoral alerts | Stale counseling + open prayer → `PASTORAL_ALERT` queue |
| Background sync engine | `AutomationSyncService` — `OUTREACH_CAPTURE`, `ATTENDANCE_BULK` (60s tick) |

**Hub:** `/dashboard/automation` · **Audit:** `AutomationRunLog` · **Settings:** `ChurchAutomationSettings`

**Tests:** `test/phase9-automation.integration-spec.ts` · **Docs:** `docs/membership/PHASE9-AUTOMATION.md`

## Phase 10 testing & hardening (complete)

| Requirement | Implementation |
|-------------|----------------|
| Unit tests | Jest across membership modules 3–9 + automation; Vitest `pwa-checklist.test.ts` |
| Integration tests | `phase10-primary-flows`, existing `phase4`–`phase9` suites |
| E2E primary flows | `e2e/membership-primary-flows.spec.ts` |
| Load & stress | `phase10-load.integration-spec.ts` (25 concurrent requests) |
| Lighthouse + PWA | `lighthouse-membership.mjs`, `pwa-audit.mjs`, `membership-pwa-offline.spec.ts` |
| Security scan | `phase10-security.integration-spec.ts`, `security-audit.mjs` |
| UI responsiveness | `membership-responsive.spec.ts` (mobile viewport) |
| Offline validation | SW + manifest audits; `offline-sync` OUTREACH_CAPTURE queue |

**Runner:** `scripts/membership-phase10/run-phase10.ps1` · **Docs:** `docs/membership/PHASE10-TESTING.md`

## Phase 11 production polish (complete)

| Requirement | Implementation |
|-------------|----------------|
| Bundle optimization | `optimizePackageImports`, lazy Recharts |
| Lazy loading | `lib/membership-lazy.tsx` |
| WCAG | Skip link, focus-visible, ARIA tabs, reduced motion |
| Cross-browser | `.browserslistrc`, iOS input sizing |
| Skeletons | `DashboardPageSkeleton` on membership hubs |
| Animations | `hub-page-enter` (motion-safe) |
| PWA offline | `sw.js` v2 + `/offline` page |
| Deploy readiness | `deployment-readiness.mjs`, `run-phase11.ps1` |

**Docs:** `docs/membership/PHASE11-POLISH.md`

## Membership roadmap

Phases **1–11** complete per Church Membership Management System outline.
