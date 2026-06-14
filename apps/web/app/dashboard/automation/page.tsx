'use client';

import { LazyMembershipAutomationHub } from '@/lib/membership-lazy';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';

export default function AutomationPage() {
  return (
    <DashboardModuleShell
      title="Automation"
      description={MODULE_DESCRIPTIONS.automation}
    >
      <div className="membership-hub-root">
        <LazyMembershipAutomationHub />
      </div>
    </DashboardModuleShell>
  );
}
