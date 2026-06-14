'use client';

import { CommunitySupportManagePanel } from '@/components/community-support/CommunitySupportManagePanel';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';
import Link from 'next/link';

export default function CommunitySupportManagePage() {
  const { userRoles, isLoading } = useModuleAccess();
  const canManage = isChurchLeadershipRole(userRoles);

  if (isLoading) return null;

  if (!canManage) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-muted-foreground">
          Church admin or pastor access is required.{' '}
          <Link href="/dashboard" className="text-primary hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    );
  }

  return (
    <DashboardModuleShell
      eyebrow="Community Support"
      title="Job & business requests"
      description={MODULE_DESCRIPTIONS.communitySupport}
    >
      <CommunitySupportManagePanel />
    </DashboardModuleShell>
  );
}
