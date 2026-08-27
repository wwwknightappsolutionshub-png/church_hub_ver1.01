'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LazyFamiliesPanel } from '@/lib/membership-lazy';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';

export default function FamiliesListPage() {
  const router = useRouter();
  const {
    canManageMembers,
    canViewMembershipDirectory,
    canAddCongregants,
    isLoading: accessLoading,
  } = useMembershipAccess();
  const { data: members } = useApiQuery<Array<{ id: string; firstName: string; lastName: string }>>(
    ['membership', '', '', ''],
    '/membership/members',
    { enabled: canViewMembershipDirectory },
  );

  useEffect(() => {
    if (accessLoading) return;
    if (!canViewMembershipDirectory && !canAddCongregants) {
      router.replace(CONGREGANTS_ROUTES.members);
    }
  }, [accessLoading, canViewMembershipDirectory, canAddCongregants, router]);

  if (accessLoading) {
    return <DashboardPageSkeleton cards={3} />;
  }

  return (
    <LazyFamiliesPanel
      canManage={canManageMembers}
      canAdd={canAddCongregants}
      canViewDirectory={canViewMembershipDirectory}
      members={(members ?? []).map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
      }))}
    />
  );
}
