'use client';

import { LazyMembershipAutomationHub } from '@/lib/membership-lazy';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';

export default function AutomationPage() {
  return (
    <DashboardModuleShell
      title="Automation"
      description="Policy-driven workflows for absentee recovery, outreach triggers, pastoral alerts, and auditable synchronization."
    >
      <div className="membership-hub-root">
        <LazyMembershipAutomationHub />
      </div>
    </DashboardModuleShell>
  );
}
