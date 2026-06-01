'use client';

import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';

export function useMembershipAnalytics(months = 6) {
  return useApiQuery<MembershipAnalyticsDashboardDto>(
    ['membership-analytics', String(months)],
    `/membership/analytics?months=${months}`,
  );
}
