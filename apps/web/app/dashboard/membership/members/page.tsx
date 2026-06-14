'use client';

import { Suspense } from 'react';
import { CongregantsMembersView } from '@/components/membership/CongregantsMembersView';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';

export default function CongregantsMembersPage() {
  return (
    <Suspense fallback={<DashboardPageSkeleton cards={3} />}>
      <CongregantsMembersView />
    </Suspense>
  );
}
