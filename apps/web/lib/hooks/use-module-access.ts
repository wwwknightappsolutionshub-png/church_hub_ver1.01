'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';
import type { ChurchTenantModulesMap } from '@church-hub/shared-types';
import type { AuthMeResponse } from '@/lib/hooks/use-membership-access';
import {
  isChurchAdminRole,
  isPastorRole,
  isPlatformAdminRole,
  isPlatformRole,
} from '@/lib/session-role';
import {
  ESTABLISHMENT_ACCESS_NONE,
  type EstablishmentAccess,
} from '@/lib/establishment-access';

export interface ModuleAccess extends AuthMeResponse {
  churchId?: string | null;
  churchName?: string | null;
  churchSlug?: string | null;
  canAccessFollowUp?: boolean;
  establishmentAccess?: EstablishmentAccess;
  canAccessServiceUnitHub?: boolean;
  canAccessDepartmentTools?: boolean;
  canAccessMyProfile?: boolean;
  memberStatus?: string | null;
  isChurchStaff?: boolean;
  isPlatformAdmin?: boolean;
  isPlatformOperator?: boolean;
  platformPermissions?: string[];
  canManageStaff?: boolean;
  /** Communication Hub CRUD (admin & pastor only). */
  canManageCommunications?: boolean;
  canAccessSermonNote?: boolean;
  canAccessMinistryCells?: boolean;
  isCellBranchWorkspaceUser?: boolean;
  userRoles?: string[];
  unitMembershipIds?: string[];
  unitAdminUnitIds?: string[];
  unitDeputyUnitIds?: string[];
  unitLeaderUnitIds?: string[];
  enabledModules?: ChurchTenantModulesMap;
  mustChangePassword?: boolean;
}

export function useModuleAccess() {
  const { data, isLoading, isError, isFetched, failureReason } = useApiQuery<ModuleAccess>(
    ['auth-me'],
    '/auth/me',
    {
      staleTime: 60_000,
      // No session → fail fast; avoid endless retry/spin when demo 2FA left tokens empty.
      retry: (count, err) => {
        const status = err.response?.status;
        if (status === 401 || status === 403 || status === 429) return false;
        if (status && status >= 500) return false;
        return count < 1;
      },
      refetchOnWindowFocus: false,
    },
  );

  const userRoles = data?.userRoles ?? data?.user?.userRoles ?? [];
  const pastorOrAdmin =
    isPastorRole(userRoles) || isChurchAdminRole(userRoles) || (data?.isChurchStaff ?? false);
  const platformPermissions = data?.platformPermissions ?? [];
  const isPlatformOperator = isPlatformRole(userRoles, {
    isPlatformAdmin: data?.isPlatformAdmin,
    isPlatformOperator: data?.isPlatformOperator,
  });
  const isPlatformAdmin = isPlatformAdminRole(userRoles, data?.isPlatformAdmin);

  const hasPlatformPermission = (key: string) =>
    isPlatformAdmin || platformPermissions.includes(key);

  const establishmentAccess: EstablishmentAccess =
    data?.establishmentAccess ?? ESTABLISHMENT_ACCESS_NONE;

  return {
    isLoading: isLoading && !isError,
    isError,
    isFetched,
    authFailureStatus: failureReason?.response?.status ?? null,
    canAccessFollowUp: data?.canAccessFollowUp ?? establishmentAccess.mode !== 'none',
    establishmentAccess,
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
    isCellBranchWorkspaceUser: data?.isCellBranchWorkspaceUser === true,
    /** Owner only */
    isPlatformAdmin,
    /** Owner or custom platform role */
    isPlatformOperator,
    platformPermissions,
    hasPlatformPermission,
    churchId: data?.churchId ?? null,
    churchName: data?.churchName ?? null,
    churchSlug: data?.churchSlug ?? null,
    memberId: data?.member?.id ?? null,
    user: data?.user ?? null,
    member: data?.member ?? null,
    userRoles,
    unitMembershipIds: data?.unitMembershipIds ?? [],
    unitAdminUnitIds: data?.unitAdminUnitIds ?? [],
    unitDeputyUnitIds: data?.unitDeputyUnitIds ?? [],
    unitLeaderUnitIds: data?.unitLeaderUnitIds ?? [],
    enabledModules: data?.enabledModules,
    mustChangePassword: data?.mustChangePassword ?? false,
  };
}
