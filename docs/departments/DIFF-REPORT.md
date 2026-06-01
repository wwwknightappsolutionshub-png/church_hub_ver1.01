# Department Modules — Diff Report

## Summary

Added five production department modules on top of existing `ServiceUnit` + Phase 8 infrastructure without breaking prior routes.

## Database

- `DepartmentCode.MEDICAL`
- 14 new tables under `dept_*` prefix, all scoped by `churchId` + `serviceUnitId`
- Migration: `20260526200000_dept_feature_modules`

## API (new)

- Module: `apps/api/src/modules/departments/`
- Controller: `DepartmentModulesController` at `service-units/:unitId/dept-tools`
- Registered in `AppModule` via `DepartmentsModule`

## Web (new)

- `components/departments/DepartmentToolsRouter.tsx`
- `components/departments/DepartmentModulePanel.tsx` (tabbed mobile UI)
- `lib/dept-module-catalog.ts`
- Service unit page routes module units to full panel; others keep Phase 8 panel

## Unchanged (by design)

- Auth middleware and `ModuleGate('serviceUnitHub')`
- Pastoral `CarePrayerRequest` vs Prayer Squad `DeptPrayerItem`
- Community Prayer Hub vs unit operations
- Phase 8 weekly reports and absentee automation

## Files touched (high level)

| Area | Files |
|------|-------|
| Prisma | `schema.prisma`, `phase8-department-catalog.ts`, `dept-module-catalog.ts`, migration |
| API | `departments/*`, `app.module.ts`, `service-units-department.service.ts` |
| Web | `service-units/[id]/page.tsx`, `membership-lazy.tsx`, `departments/*` |
| Shared | `packages/shared-types/src/department-modules.ts` |
| Tests | `dept-modules.integration-spec.ts`, `department-access.service.spec.ts` |
| Docs | `docs/departments/*` |
