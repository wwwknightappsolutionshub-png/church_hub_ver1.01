'use client';

import type { ReactNode } from 'react';
import type { MembershipDashboardStatsDto } from '@church-hub/shared-types';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { Badge } from '@/components/ui/badge';
import { CongregantsFeatureNav } from '@/components/membership/CongregantsFeatureNav';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { EnterpriseHero, EnterpriseShell } from '@/components/layout/EnterpriseModuleShell';

export function CongregantsModuleShell({
  children,
  actions,
}: {
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { data: stats } = useApiQuery<MembershipDashboardStatsDto>(
    ['membership-stats'],
    '/membership/stats',
  );

  return (
    <EnterpriseShell>
      <EnterpriseHero
        eyebrow="People & Households"
        title="Congregants"
        description={MODULE_DESCRIPTIONS.congregants}
        badge={
          stats ? (
            <Badge variant="outline" className="border-slate-500 text-slate-200">
              {stats.congregants.toLocaleString()} in registry
            </Badge>
          ) : undefined
        }
        actions={actions}
      />
      <CongregantsFeatureNav />
      <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">{children}</div>
    </EnterpriseShell>
  );
}
