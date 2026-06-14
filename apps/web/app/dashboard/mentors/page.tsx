'use client';

import Link from 'next/link';
import { MODULE_DESCRIPTIONS } from '@/lib/module-descriptions';
import { DashboardModuleShell } from '@/components/layout/DashboardModuleShell';
import { MentorsManagePanel } from '@/components/business/MentorsManagePanel';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import { isChurchLeadershipRole } from '@/lib/session-role';

export default function MentorsManagePage() {
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
      title="Mentors"
      description={MODULE_DESCRIPTIONS.mentors}
    >
      <MentorsManagePanel />
    </DashboardModuleShell>
  );
}
