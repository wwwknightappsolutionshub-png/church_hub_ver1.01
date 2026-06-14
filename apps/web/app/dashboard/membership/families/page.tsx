'use client';

import { LazyFamiliesPanel } from '@/lib/membership-lazy';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useMembershipAccess } from '@/lib/hooks/use-membership-access';

export default function FamiliesListPage() {
  const { canManageMembers } = useMembershipAccess();
  const { data: members } = useApiQuery<Array<{ id: string; firstName: string; lastName: string }>>(
    ['membership', '', '', ''],
    '/membership/members',
  );

  return (
    <LazyFamiliesPanel
      canManage={canManageMembers}
      members={(members ?? []).map((m) => ({
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
      }))}
    />
  );
}
