/** Establishment (former Follow-up CRM) access modes — Phase 2. */
export type EstablishmentAccessMode =
  | 'none'
  | 'manager'
  | 'worker'
  | 'viewOnly'
  | 'wsfLeader';

export interface EstablishmentAccess {
  mode: EstablishmentAccessMode;
  /** Create Establishment contacts (not Outreach capture). */
  canCreate: boolean;
  /** Assign / reassign contacts to workers. */
  canAssign: boolean;
  /** Mutate assigned (or all, if manager) contacts: stage, notes, reminders, messaging, archive request. */
  canMutate: boolean;
  /** See contacts with no assignee. */
  canViewUnassigned: boolean;
  /** Soft-archive immediately (managers). */
  canArchive: boolean;
  /** Request archive (workers on assigned contacts). */
  canRequestArchive: boolean;
  /** Assign a contact to a WSF cell branch. */
  canAssignWsf: boolean;
  /** Cell branch IDs this user leads (WSF scope). Empty unless wsfLeader (or manager for listing). */
  wsfBranchIds: string[];
}

export const ESTABLISHMENT_ACCESS_NONE: EstablishmentAccess = {
  mode: 'none',
  canCreate: false,
  canAssign: false,
  canMutate: false,
  canViewUnassigned: false,
  canArchive: false,
  canRequestArchive: false,
  canAssignWsf: false,
  wsfBranchIds: [],
};

export function establishmentAccessFromMode(
  mode: Exclude<EstablishmentAccessMode, 'none'>,
  wsfBranchIds: string[] = [],
): EstablishmentAccess {
  switch (mode) {
    case 'manager':
      return {
        mode,
        canCreate: true,
        canAssign: true,
        canMutate: true,
        canViewUnassigned: true,
        canArchive: true,
        canRequestArchive: false,
        canAssignWsf: true,
        wsfBranchIds,
      };
    case 'worker':
      return {
        mode,
        canCreate: false,
        canAssign: false,
        canMutate: true,
        canViewUnassigned: false,
        canArchive: false,
        canRequestArchive: true,
        canAssignWsf: false,
        wsfBranchIds: [],
      };
    case 'viewOnly':
      return {
        mode,
        canCreate: false,
        canAssign: false,
        canMutate: false,
        canViewUnassigned: false,
        canArchive: false,
        canRequestArchive: false,
        canAssignWsf: false,
        wsfBranchIds: [],
      };
    case 'wsfLeader':
      return {
        mode,
        canCreate: false,
        canAssign: false,
        canMutate: false,
        canViewUnassigned: false,
        canArchive: false,
        canRequestArchive: false,
        canAssignWsf: false,
        wsfBranchIds,
      };
  }
}
