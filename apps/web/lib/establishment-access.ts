/** Mirrors API EstablishmentAccess (Phase 2). */
export type EstablishmentAccessMode =
  | 'none'
  | 'manager'
  | 'worker'
  | 'viewOnly'
  | 'wsfLeader';

export interface EstablishmentAccess {
  mode: EstablishmentAccessMode;
  canCreate: boolean;
  canAssign: boolean;
  canMutate: boolean;
  canViewUnassigned: boolean;
  canArchive: boolean;
  canRequestArchive: boolean;
  canAssignWsf: boolean;
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

export function isEstablishmentReadOnly(access: EstablishmentAccess): boolean {
  return access.mode === 'viewOnly' || access.mode === 'wsfLeader' || !access.canMutate;
}
