'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { MembershipPipelineSettingsPanel } from '@/components/settings/MembershipPipelineSettingsPanel';
import { ModuleGate } from '@/components/app/ModuleGate';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import {
  EnterpriseContent,
  EnterpriseHero,
  EnterpriseShell,
  enterpriseHeroChipClass,
} from '@/components/layout/EnterpriseModuleShell';
import { cn } from '@/lib/utils';

function MembershipPipelineSettingsContent() {
  const { userRoles, isLoading } = useModuleAccess();
  const allowed = isChurchLeadershipRole(userRoles);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  if (!allowed) {
    return (
      <p className="text-sm text-muted-foreground">
        Only Church Admin or Pastor can customize the membership pipeline.
      </p>
    );
  }

  return <MembershipPipelineSettingsPanel />;
}

export default function MembershipPipelineSettingsPage() {
  return (
    <ModuleGate gate="followUp">
      <EnterpriseShell>
        <EnterpriseHero
          title="Membership Pipeline"
          description="Choose a system template, activate it for Establishment, and customize labels for your church when needed."
          actions={
            <Link
              href="/dashboard/settings"
              className={cn(
                'inline-flex h-9 items-center rounded-md px-3 text-sm',
                enterpriseHeroChipClass,
              )}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Settings
            </Link>
          }
        />
        <EnterpriseContent className="pb-24 md:pb-8">
          <MembershipPipelineSettingsContent />
        </EnterpriseContent>
      </EnterpriseShell>
    </ModuleGate>
  );
}
