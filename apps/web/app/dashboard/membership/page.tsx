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
  const {
    canManageMembers,
    canViewMembershipDirectory,
    canAddCongregants,
    isLoading: accessLoading,
  } = useMembershipAccess();
  const { data: stats } = useApiQuery<MembershipDashboardStatsDto>(
    ['membership-stats'],
    '/membership/stats',
  );

  useEffect(() => {
    if (accessLoading) return;
    if (searchParams.get('add') === '1') {
      router.replace(`${CONGREGANTS_ROUTES.members}?add=1`);
    }
  }, [searchParams, router, accessLoading]);

  return (
    <div className="space-y-8">
      {stats && canViewMembershipDirectory ? (
        <>
          <CongregantsOverviewStats stats={stats} canViewDirectory={canViewMembershipDirectory} />
          <StatusPipeline
            counts={stats.byStatus}
            onFilter={(status) =>
              router.push(`${CONGREGANTS_ROUTES.members}${status ? `?status=${status}` : ''}`)
            }
          />
        </>
      ) : null}

      {canViewMembershipDirectory ? <CongregantsWeeklyAttendanceFlow /> : null}

      {canViewMembershipDirectory ? <CelebrationColumnsPanel /> : null}

      {!canViewMembershipDirectory && canAddCongregants ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Add to registry</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can add congregants and families. Member directories are visible to Church Admin and
            Pastor only.
          </p>
        </div>
      ) : null}

      <CongregantsOverviewActions
        canManage={canManageMembers}
        canViewDirectory={canViewMembershipDirectory}
        canAdd={canAddCongregants}
      />
    </div>
  );
}
