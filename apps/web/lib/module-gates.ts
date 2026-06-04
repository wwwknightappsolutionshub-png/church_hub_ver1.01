export type ModuleGateType = 'followUp' | 'serviceUnitHub' | 'departmentTools' | 'profile' | 'sermonNote' | 'ministryCells';

export const MODULE_GATE_LABELS: Record<ModuleGateType, string> = {
  followUp: 'Follow-Up',
  serviceUnitHub: 'Service Unit Hub',
  departmentTools: 'Departments',
  profile: 'My Profile',
  sermonNote: 'Sermon Note',
  ministryCells: 'Ministry/Cells',
};

export interface ModuleGateAccess {
  canAccessFollowUp: boolean;
  canAccessServiceUnitHub: boolean;
  canAccessDepartmentTools: boolean;
  canAccessMyProfile: boolean;
  canAccessSermonNote?: boolean;
  canAccessMinistryCells?: boolean;
  accessLoading: boolean;
}

export function canAccessGate(gate: ModuleGateType, access: ModuleGateAccess): boolean {
  if (access.accessLoading) return false;
  switch (gate) {
    case 'followUp':
      return access.canAccessFollowUp;
    case 'serviceUnitHub':
      return access.canAccessServiceUnitHub;
    case 'departmentTools':
      return access.canAccessDepartmentTools;
    case 'profile':
      return access.canAccessMyProfile;
    case 'sermonNote':
      return access.canAccessSermonNote ?? false;
    case 'ministryCells':
      return access.canAccessMinistryCells ?? false;
  }
}

export function gateRequirementHint(
  gate: ModuleGateType,
  memberStatus?: string | null,
  memberRoles?: string[],
): string {
  const status = memberStatus?.replace(/_/g, ' ') ?? 'not linked';
  const roles = memberRoles?.length ? memberRoles.join(', ') : 'none';

  switch (gate) {
    case 'followUp':
      return `Available to church staff, Follow-up / Harvesters / Prayer / Winning Foundation units, or Evangelist role. Your status: ${status}. Roles: ${roles}.`;
    case 'serviceUnitHub':
      return `Available when you are New Member, Active Member, or Discipled—or already assigned to a service unit. Your status: ${status}.`;
    case 'departmentTools':
      return 'Available to church admin, pastor, or department unit leader only.';
    case 'profile':
      return `Available when your membership is beyond Visitor (New Member, Active Member, or Discipled). Your status: ${status}. Roles: ${roles}.`;
    case 'sermonNote':
      return 'Available to pastors only.';
    case 'ministryCells':
      return 'Available to church admin, pastor, or assigned cell branch leaders.';
  }
}
