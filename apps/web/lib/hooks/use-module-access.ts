'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ChurchTenantModulesMap } from '@church-hub/shared-types';
import type { AuthMeResponse } from '@/lib/hooks/use-membership-access';
import { isChurchAdminRole, isPastorRole, isPlatformRole } from '@/lib/session-role';

export interface ModuleAccess extends AuthMeResponse {
  churchId?: string | null;
  churchName?: string | null;
  churchSlug?: string | null;
  canAccessFollowUp?: boolean;
  canAccessServiceUnitHub?: boolean;
  canAccessDepartmentTools?: boolean;
  canAccessMyProfile?: boolean;
  memberStatus?: string | null;
  isChurchStaff?: boolean;
  isPlatformAdmin?: boolean;
  canManageStaff?: boolean;
  /** Communication Hub CRUD (admin & pastor only). */
  canManageCommunications?: boolean;
  canAccessSermonNote?: boolean;
  canAccessMinistryCells?: boolean;
  userRoles?: string[];
  unitMembershipIds?: string[];
  unitAdminUnitIds?: string[];
  unitLeaderUnitIds?: string[];
  enabledModules?: ChurchTenantModulesMap;
  mustChangePassword?: boolean;
}

export function useModuleAccess() {
  const { data, isLoading } = useApiQuery<ModuleAccess>(['auth-me'], '/auth/me', {
    staleTime: 60_000,
  });

  const userRoles = data?.userRoles ?? data?.user?.userRoles ?? [];
  const pastorOrAdmin =
    isPastorRole(userRoles) || isChurchAdminRole(userRoles) || (data?.isChurchStaff ?? false);

  return {
    isLoading,
    canAccessFollowUp: data?.canAccessFollowUp ?? false,
    canAccessServiceUnitHub: data?.canAccessServiceUnitHub ?? false,
    canAccessDepartmentTools: data?.canAccessDepartmentTools ?? false,
    canAccessMyProfile: data?.canAccessMyProfile ?? false,
    memberStatus: data?.member?.status ?? null,
    memberRoles: data?.memberRoles ?? data?.member?.roles ?? [],
    canManageMembers: data?.canManageMembers ?? false,
    canManageStaff: data?.canManageStaff ?? false,
    isChurchStaff: data?.isChurchStaff ?? false,
    canManageCommunications: data?.canManageCommunications ?? data?.isChurchStaff ?? false,
    canAccessSermonNote: data?.canAccessSermonNote === true,
    canAccessMinistryCells: data?.canAccessMinistryCells === true || pastorOrAdmin,
    isPlatformAdmin: isPlatformRole(data?.userRoles, data?.isPlatformAdmin),
    churchId: data?.churchId ?? null,
    churchName: data?.churchName ?? null,
    churchSlug: data?.churchSlug ?? null,
    memberId: data?.member?.id ?? null,
    user: data?.user ?? null,
    member: data?.member ?? null,
    userRoles,
    unitMembershipIds: data?.unitMembershipIds ?? [],
    unitAdminUnitIds: data?.unitAdminUnitIds ?? [],
    unitLeaderUnitIds: data?.unitLeaderUnitIds ?? [],
    enabledModules: data?.enabledModules,
    mustChangePassword: data?.mustChangePassword ?? false,
  };
}
