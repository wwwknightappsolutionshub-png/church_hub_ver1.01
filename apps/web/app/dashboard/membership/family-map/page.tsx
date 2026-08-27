'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CongregantsFamilyMapView } from '@/components/membership/CongregantsFamilyMapView';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';

export default function CongregantsFamilyMapPage() {
  const router = useRouter();
  const { canViewMembershipDirectory, isLoading } = useMembershipAccess();

  useEffect(() => {
    if (isLoading) return;
    if (!canViewMembershipDirectory) {
      router.replace(CONGREGANTS_ROUTES.members);
    }
  }, [isLoading, canViewMembershipDirectory, router]);

  if (isLoading || !canViewMembershipDirectory) {
    return <DashboardPageSkeleton cards={2} />;
  }

  return <CongregantsFamilyMapView />;
}
