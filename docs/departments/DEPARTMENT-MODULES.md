# Department Modules Integration

Production department feature modules for **Medical**, **Media**, **Children's Church Teachers**, **Choir**, and **Prayer Squad**, integrated with existing service units, Phase 8 attendance, communications queue, and RBAC.

## Architecture

| Layer | Location |
|-------|----------|
| Catalog | `apps/api/prisma/dept-module-catalog.ts` |
| Schema | `DeptSchedule`, `DeptAssignment`, `DeptModuleReport`, `DeptInventoryItem`, `DeptResource`, `DeptTask`, `DeptIncident`, `DeptChildCheckIn`, `DeptPrayerItem`, `DeptSkill`, `DeptChoirSong`, `DeptCertification`, `DeptProgressNote`, `DeptPrayerChecklist`, `DeptFollowUpLog` |
| Migration | `apps/api/prisma/migrations/20260526200000_dept_feature_modules` |
| API | `GET/POST …/api/v1/service-units/:unitId/dept-tools/*` |
| Web | `DepartmentToolsRouter` → `DepartmentModulePanel` on service unit **Department** tab |
| RBAC | Pastor/Admin: full via `canManageServiceUnit`; unit members: participate (submit attendance, reports, tasks) |

## RBAC

- **Pastor / Admin (`isChurchStaff`)**: view and manage all department units.
- **Department head (`ServiceUnitLeader.isUnitAdmin`)**: full module access for their unit.
- **Department member (`ServiceUnitMember`)**: restricted write (assignments self, inventory, reports, check-in, prayer queue).
- **Others**: no access (`canViewServiceUnit` false).

## API overview

Base path: `/api/v1/service-units/:unitId/dept-tools`

- `GET context` — unit + access flags
- `GET dashboard` — stats + upcoming schedules
- Schedules, assignments, inventory, resources, tasks
- Medical: `incidents`, `certifications`
- Children: `check-ins`
- Choir: `songs`
- Prayer: `prayer-items`, `checklist`, `follow-ups`
- `reports`, `alerts` (manage only)

Phase 8 shared attendance remains at `/service-units/departments/:id/attendance/bulk`.

## UI

Open **Dashboard → Service Units → [unit] → Department** for a module-enabled unit (`MEDICAL`, `MEDIA`, `CHILDREN`, `CHOIR`, `PRAYER`). Other Phase 8 units still use the generic `DepartmentDashboardPanel`.

Mobile-first horizontal tab navigation; forum links to existing unit forum.

## Tests

```bash
cd apps/api
npx jest --testPathPattern=department-access.service.spec
npx jest --testPathPattern=dept-modules.integration-spec
```

Integration tests require `DATABASE_URL` (skip with `SKIP_E2E=true`).

## Deploy

1. Stop API process (Windows EPERM on `prisma generate`).
2. `pnpm --filter @church-hub/api exec prisma migrate deploy`
3. `pnpm --filter @church-hub/api exec prisma generate`
4. Restart API + web.

Rollback: restore DB backup before migration `20260526200000_dept_feature_modules`.
