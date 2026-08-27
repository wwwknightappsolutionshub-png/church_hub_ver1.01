'use client';

import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import {
  analyticsFiltersCacheKey,
  analyticsFiltersToQuery,
  type AnalyticsUiFilters,
} from '@/lib/membership-analytics-filters';

export function useMembershipAnalytics(filters: AnalyticsUiFilters) {
  const qs = analyticsFiltersToQuery(filters);
  return useApiQuery<MembershipAnalyticsDashboardDto>(
    analyticsFiltersCacheKey(filters),
    `/membership/analytics?${qs}`,
  );
}

export function useMembershipAnalyticsTargets() {
  return useApiQuery<{
    retentionRate: number | null;
    attendanceRate: number | null;
    outreachCompletionRate: number | null;
    monthlyNewMembers: number | null;
  }>(['membership-analytics-targets'], '/membership/analytics/targets');
}
