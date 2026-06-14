'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LazyMembershipRegistrySettingsPanel } from '@/lib/membership-lazy';
import { invalidateMembershipQueries } from '@/lib/membership/invalidate-membership';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';

export default function CongregantsSettingsPage() {
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();

  if (!canManageMembers) {
    return <p className="text-sm text-muted-foreground">You do not have permission to manage registry settings.</p>;
  }

  return (
    <LazyMembershipRegistrySettingsPanel
      onChanged={() => invalidateMembershipQueries(queryClient)}
    />
  );
}
