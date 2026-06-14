'use client';

import { useQueryClient } from '@tanstack/react-query';
import { LazyMembershipImportWizard } from '@/lib/membership-lazy';
import { invalidateMembershipQueries } from '@/lib/membership/invalidate-membership';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';

export default function CongregantsImportPage() {
  const queryClient = useQueryClient();
  const { canManageMembers } = useMembershipAccess();

  if (!canManageMembers) {
    return <p className="text-sm text-muted-foreground">You do not have permission to import members.</p>;
  }

  return (
    <LazyMembershipImportWizard onComplete={() => invalidateMembershipQueries(queryClient)} />
  );
}
