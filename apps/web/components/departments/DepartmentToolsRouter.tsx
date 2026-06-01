'use client';

import {
  isDeptModuleCode,
  resolveDeptModuleCode,
  usesLegacyDepartmentWorkspace,
} from '@/lib/dept-module-catalog';
import { DepartmentModulePanel } from '@/components/departments/DepartmentModulePanel';
import { LegacyDepartmentWorkspace } from '@/components/departments/LegacyDepartmentWorkspace';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ServiceUnitAccessFlags {
  canViewFeedbacks?: boolean;
  canLead?: boolean;
  canManage?: boolean;
}

interface DepartmentToolsRouterProps {
  unitId: string;
  departmentCode: string | null | undefined;
  unitName: string;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
  unitAccess?: ServiceUnitAccessFlags;
}

/** Routes Phase 8 generic tools vs legacy department workspace (Home + Reports + Feedbacks). */
export function DepartmentToolsRouter({
  unitId,
  departmentCode,
  unitName,
  canManage,
  members,
  unitAccess,
}: DepartmentToolsRouterProps) {
  if (usesLegacyDepartmentWorkspace(unitName)) {
    return (
      <LegacyDepartmentWorkspace
        unitId={unitId}
        unitName={unitName}
        canManage={canManage}
        members={members}
        unitAccess={unitAccess}
      />
    );
  }

  const effectiveCode = resolveDeptModuleCode(departmentCode, unitName) ?? departmentCode ?? '';

  if (isDeptModuleCode(effectiveCode)) {
    return (
      <DepartmentModulePanel
        unitId={unitId}
        departmentCode={effectiveCode}
        canManage={canManage}
        members={members}
        unitAccess={unitAccess}
      />
    );
  }

  return (
    <LegacyDepartmentWorkspace
      unitId={unitId}
      unitName={unitName}
      canManage={canManage}
      members={members}
      unitAccess={unitAccess}
    />
  );
}
