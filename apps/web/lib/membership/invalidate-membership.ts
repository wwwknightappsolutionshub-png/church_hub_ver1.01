import type { QueryClient } from '@tanstack/react-query';

export function invalidateMembershipQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ['membership'] });
  queryClient.invalidateQueries({ queryKey: ['membership-stats'] });
  queryClient.invalidateQueries({ queryKey: ['membership-families'] });
  queryClient.invalidateQueries({ queryKey: ['membership-congregant-analytics'] });
  queryClient.invalidateQueries({ queryKey: ['membership-email-links'] });
  queryClient.invalidateQueries({ queryKey: ['membership-admin-catalog'] });
}
