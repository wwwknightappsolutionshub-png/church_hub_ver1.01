'use client';

import { useApiQuery } from '@/lib/hooks/use-api-query';

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
  isMemberAdmin: boolean;
}

export function useMembershipAccess() {
  const { data, isLoading } = useApiQuery<AuthMeResponse>(
    ['auth-me'],
    '/auth/me',
    { staleTime: 60_000 },
  );

  return {
    isLoading,
    canManageMembers: data?.canManageMembers ?? false,
    isMemberAdmin: data?.isMemberAdmin ?? false,
    userRoles: data?.user?.userRoles ?? [],
    member: data?.member ?? null,
  };
}
