# Department modules — audit & manual test checklist

Use this document to verify each new department module end-to-end after `prisma migrate deploy` (migration `20260526200000_dept_feature_modules`).

## What was added

| Layer | Artifact |
|-------|----------|
| **Nest module** | `apps/api/src/modules/departments/` (`DepartmentsModule`, `DepartmentAccessService`, `DepartmentModulesService`, `DepartmentModulesController`) |
| **DB** | 14 `dept_*` tables + `DepartmentCode.MEDICAL` |
| **Web** | `DepartmentToolsRouter`, `DepartmentModulePanel`, `lib/dept-module-catalog.ts` |
| **Route** | `apps/web/app/dashboard/departments/page.tsx` |
| **Docs** | `DEPARTMENT-MODULES.md`, `DIFF-REPORT.md` |
| **Tests** | `department-access.service.spec.ts`, `dept-modules.integration-spec.ts` |

## Five production department modules

These units get the **full** `DepartmentModulePanel` (not only the Phase 8 generic panel).

| Code | Catalog unit name | Where to open in UI |
|------|-------------------|---------------------|
| `MEDICAL` | Medical | Dashboard → **Departments** or **Service Unit Hub** → unit → **Department** tab |
| `MEDIA` | Media | Same |
| `CHILDREN` | Children's Church Teachers | Same |
| `CHOIR` | Choir | Same |
| `PRAYER` | Prayer Squad | Same |

**Prerequisite:** Log in as church staff or a member assigned to the unit. Unit `departmentCode` should match the table above (or name resolves via `resolveDeptModuleCode`).

**API base:** `GET/POST /api/v1/service-units/departments/{unitId}/dept-tools/...`

---

## Per-module test matrix

### 1. Medical (`MEDICAL`)

| # | Feature | UI tab | Test steps | Expected |
|---|---------|--------|------------|----------|
| 1 | Context / RBAC | Home | Open Department tab | Stats load; manage actions only if unit admin/staff |
| 2 | Dashboard stats | Home | Refresh | Counts for incidents, inventory, certifications (or zeros) |
| 3 | Incidents | Incidents | Create incident (member can participate) | Appears in list |
| 4 | Inventory | Inventory | Add item | Listed with quantity/status |
| 5 | Certifications | Certifications | Add cert (manage) | Visible to admins |
| 6 | Reports | Reports | Submit weekly report | Saved |
| 7 | Attendance | Attendance | Record bulk attendance | Uses Phase 8 path; cards visible |
| 8 | Schedule / assignments | Schedule, Assignments | Add shift + assignment | Listed |
| 9 | Library | Library | Add resource | Listed |

**API smoke:** `GET .../context`, `GET .../dashboard`, `POST .../incidents`, `POST .../inventory`, `POST .../certifications`

---

### 2. Media (`MEDIA`)

| # | Feature | UI tab | Test steps | Expected |
|---|---------|--------|------------|----------|
| 1 | Home dashboard | Home | Open unit | Task/inventory stats |
| 2 | Inventory | Inventory | Add gear | Persists |
| 3 | Projects (Kanban) | Projects | Create task, move status | Task updates |
| 4 | Skills | Skills | Add skill + member | Listed |
| 5 | Schedule / assignments | Schedule, Assignments | Create | OK |
| 6 | Library | Library | Upload/link resource | OK |
| 7 | Reports | Reports | Submit | OK |
| 8 | Attendance | Attendance | Record | OK |

**API smoke:** `GET .../tasks`, `POST .../tasks`, `GET .../skills`, `POST .../inventory`

---

### 3. Children's Church Teachers (`CHILDREN`)

| # | Feature | UI tab | Test steps | Expected |
|---|---------|--------|------------|----------|
| 1 | Home | Home | Open unit | Check-in / lesson stats |
| 2 | Check-in / out | Check-in | Check child in, then out | Status updates |
| 3 | Progress notes | Progress | Add note for child | Listed |
| 4 | Library (lesson plans) | Library | Add `LESSON_PLAN` resource | Filtered list |
| 5 | Reports | Reports | Submit | OK |
| 6 | Attendance | Attendance | Record | OK |
| 7 | Schedule | Schedule | Add service slot | OK |

**API smoke:** `POST .../check-ins`, `PATCH .../check-ins/{id}/checkout`, `POST .../progress-notes`

---

### 4. Choir (`CHOIR`)

| # | Feature | UI tab | Test steps | Expected |
|---|---------|--------|------------|----------|
| 1 | Home | Home | Open unit | Song/rehearsal stats |
| 2 | Repertoire | Repertoire | Add song | Listed with key/tempo fields |
| 3 | Assignments (vocal roles) | Assignments | Assign member to part | Saved |
| 4 | Schedule | Schedule | Add rehearsal | Upcoming on Home |
| 5 | Library | Library | Add sheet music resource | OK |
| 6 | Reports | Reports | Submit | OK |
| 7 | Attendance | Attendance | Record | OK |

**API smoke:** `GET .../songs`, `POST .../songs`, `POST .../assignments`

---

### 5. Prayer Squad (`PRAYER`)

| # | Feature | UI tab | Test steps | Expected |
|---|---------|--------|------------|----------|
| 1 | Home | Home | Open unit | Queue/checklist stats |
| 2 | Prayer queue | Prayer queue | Add item, mark prayed | Status updates |
| 3 | Daily checklist | Checklist | Toggle items | Persists per day |
| 4 | Follow-ups | Follow-ups | Log follow-up | Listed |
| 5 | Library (prayer points) | Library | Add resource | OK |
| 6 | Reports | Reports | Submit | OK |
| 7 | Attendance | Attendance | Record | OK |

**API smoke:** `POST .../prayer-items`, `PATCH .../prayer-items/{id}`, `GET .../checklist`, `POST .../follow-ups`

---

## Shared features (all five modules)

| # | Feature | How to test | API |
|---|---------|-------------|-----|
| 1 | Context + access flags | Non-member should not see tools | `GET .../dept-tools/context` |
| 2 | Dashboard | Home tab loads without infinite spinner | `GET .../dept-tools/dashboard` |
| 3 | Schedules | Create + delete | `POST/DELETE .../schedules` |
| 4 | Assignments | Upsert + delete | `POST/DELETE .../assignments` |
| 5 | Reports | Submit module report | `POST .../reports` |
| 6 | Alerts (manage only) | Send alert if manage | `POST .../alerts` |
| 7 | Forum link | Messages tab → unit forum | Existing forum route |
| 8 | Phase 8 attendance | Attendance tab | `POST .../service-units/departments/{id}/attendance/bulk` |

---

## Phase 8 units (unchanged generic panel)

Units such as **Ushering**, **Youth**, **Teens**, **Protocol**, **Evangelism** still use `DepartmentDashboardPanel` only (no full dept-tools CRUD). Confirm:

- Department tab shows attendance + weekly report UI
- No duplicate global search bar in dashboard shell (removed from `DashboardShell`)

---

## Automated tests

```bash
cd apps/api
npx jest --testPathPattern=department-access.service.spec
npx jest --testPathPattern=dept-modules.integration-spec
```

Set `SKIP_E2E=true` to skip integration tests without `DATABASE_URL`.

---

## Deploy checklist

1. Stop API (Windows: avoids Prisma EPERM on generate).
2. `pnpm --filter @church-hub/api exec prisma migrate deploy`
3. `pnpm --filter @church-hub/api exec prisma generate`
4. Restart API + web.
5. Seed or assign yourself to each of the five units, then run the tables above.

---

## UI entry points (quick links)

| Page | Path |
|------|------|
| Department list | `/dashboard/departments` |
| Service unit hub | `/dashboard/service-units` |
| Single unit (Department tab) | `/dashboard/service-units/{unitId}?tab=department` |
| Automation (separate fix) | `/dashboard/automation` |
