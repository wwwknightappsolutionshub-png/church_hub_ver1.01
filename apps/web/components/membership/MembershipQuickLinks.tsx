'use client';

import { Home, List, UserPlus, Users } from 'lucide-react';
import type { MembershipEmailLinksDto } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { EmailRoleMenu } from '@/components/membership/EmailRoleMenu';

interface Props {
  canManage: boolean;
  emailLinks?: MembershipEmailLinksDto | null;
  onAddCongregant: () => void;
  onAddFamily: () => void;
  onCongregantList: () => void;
  onFamilyList: () => void;
}

export function MembershipQuickLinks({
  canManage,
  emailLinks,
  onAddCongregant,
  onAddFamily,
  onCongregantList,
  onFamilyList,
}: Props) {
  const byRoleAll = (emailLinks?.byFamilyRole ?? [])
    .filter((r) => r.all)
    .map((r) => ({ role: r.role, href: r.all }));
  const byRoleBcc = (emailLinks?.byFamilyRole ?? [])
    .filter((r) => r.bcc)
    .map((r) => ({ role: r.role, href: r.bcc }));

  return (
    <div
      className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/50 p-3"
      data-testid="membership-quick-links"
    >
      {canManage && (
        <>
          <Button size="sm" onClick={onAddCongregant} data-testid="quick-add-congregant">
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Congregant
          </Button>
          <Button size="sm" variant="secondary" onClick={onAddFamily} data-testid="quick-add-family">
            <Home className="mr-1.5 h-4 w-4" />
            Add Family
          </Button>
        </>
      )}
      <Button size="sm" variant="outline" onClick={onCongregantList} data-testid="quick-congregant-list">
        <List className="mr-1.5 h-4 w-4" />
        Congregant List
      </Button>
      <Button size="sm" variant="outline" onClick={onFamilyList} data-testid="quick-family-list">
        <Users className="mr-1.5 h-4 w-4" />
        Family List
      </Button>

      <EmailRoleMenu
        label="Email All"
        testId="email-all-menu"
        allHref={emailLinks?.all}
        allLabel="All congregants"
        byRole={byRoleAll}
      />
      <EmailRoleMenu
        label="Email BCC"
        testId="email-bcc-menu"
        allHref={emailLinks?.bcc}
        allLabel="All congregants (BCC)"
        byRole={byRoleBcc}
      />
    </div>
  );
}
