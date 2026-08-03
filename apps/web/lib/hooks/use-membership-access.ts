'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';
import { isChurchLeadershipRole, isLeaderRole } from '@/lib/session-role';

export interface AuthMeResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    userRoles: string[];
  } | null;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    nickname?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    roles: string[];
    status: string;
  } | null;
  canAccessFollowUp?: boolean;
  canAccessServiceUnitHub?: boolean;
  canAccessMyProfile?: boolean;
  memberRoles: string[];
  canManageMembers: boolean;
  canViewMembershipDirectory?: boolean;
  canAddCongregants?: boolean;
  isMemberAdmin: boolean;
}

export function useMembershipAccess() {
  const { data, isLoading } = useApiQuery<AuthMeResponse>(
    ['auth-me'],
    '/auth/me',
    { staleTime: 60_000 },
  );

  const userRoles = data?.user?.userRoles ?? [];
  const canManageMembers = data?.canManageMembers ?? false;
  const canViewMembershipDirectory =
    data?.canViewMembershipDirectory ?? isChurchLeadershipRole(userRoles);
  const canAddCongregants =
    data?.canAddCongregants ??
    (Boolean(data?.user) || canManageMembers || isLeaderRole(userRoles) || canViewMembershipDirectory);

  return {
    isLoading,
    canManageMembers,
    canViewMembershipDirectory,
    canAddCongregants,
    isMemberAdmin: data?.isMemberAdmin ?? false,
    userRoles,
    member: data?.member ?? null,
  };
}
