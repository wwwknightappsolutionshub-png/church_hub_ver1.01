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
} from '@/components/layout/EnterpriseModuleShell';
import { Button } from '@/components/ui/button';

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
          description="Choose a system template, customize (fork) your church journey, and merge product updates when available."
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/settings">
                <ChevronLeft className="mr-1 h-4 w-4" />
                Settings
              </Link>
            </Button>
          }
        />
        <EnterpriseContent className="pb-24 md:pb-8">
          <MembershipPipelineSettingsContent />
        </EnterpriseContent>
      </EnterpriseShell>
    </ModuleGate>
  );
}
