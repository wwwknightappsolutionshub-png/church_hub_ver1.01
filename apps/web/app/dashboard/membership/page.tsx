'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { MembershipDashboardStatsDto } from '@church-hub/shared-types';
import { CongregantsOverviewActions } from '@/components/membership/CongregantsOverviewActions';
import { CongregantsOverviewStats } from '@/components/membership/CongregantsOverviewStats';
import { CongregantsWeeklyAttendanceFlow } from '@/components/membership/CongregantsWeeklyAttendanceFlow';
import { CelebrationColumnsPanel } from '@/components/membership/CelebrationColumnsPanel';
import { StatusPipeline } from '@/components/membership/StatusPipeline';
import { CONGREGANTS_ROUTES } from '@/lib/membership/routes';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';

export default function CongregantsOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canManageMembers } = useMembershipAccess();
  const { data: stats } = useApiQuery<MembershipDashboardStatsDto>(
    ['membership-stats'],
    '/membership/stats',
  );

  useEffect(() => {
    if (searchParams.get('add') === '1') {
      router.replace(`${CONGREGANTS_ROUTES.members}?add=1`);
    }
  }, [searchParams, router]);

  return (
    <div className="space-y-8">
      {stats ? (
        <>
          <CongregantsOverviewStats stats={stats} />
          <StatusPipeline
            counts={stats.byStatus}
            onFilter={(status) =>
              router.push(`${CONGREGANTS_ROUTES.members}${status ? `?status=${status}` : ''}`)
            }
          />
        </>
      ) : null}

      <CongregantsWeeklyAttendanceFlow />

      <CelebrationColumnsPanel />

      <CongregantsOverviewActions canManage={canManageMembers} />
    </div>
  );
}
