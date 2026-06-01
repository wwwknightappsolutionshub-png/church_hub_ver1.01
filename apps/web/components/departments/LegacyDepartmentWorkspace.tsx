'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Inbox, LayoutDashboard } from 'lucide-react';
import { DepartmentDashboardPanel } from '@/components/service-units/DepartmentDashboardPanel';
import { DepartmentReportsSection } from '@/components/departments/DepartmentReportsSection';
import { DepartmentFeedbacksSection } from '@/components/departments/DepartmentFeedbacksSection';
import { DepartmentLayout, type DepartmentTabItem } from '@/components/departments/DepartmentLayout';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { useModuleAccess } from '@/lib/hooks/use-module-access';
import type { ServiceUnitAccessFlags } from '@/components/departments/DepartmentToolsRouter';

type LegacyTab = 'dashboard' | 'reports' | 'feedbacks';

interface MemberRef {
  id: string;
  firstName: string;
  lastName: string;
}

const LEADERSHIP_TABS: DepartmentTabItem[] = [
  { id: 'reports', label: 'Reports', icon: ClipboardList },
  { id: 'feedbacks', label: 'Feedbacks', icon: Inbox },
];

/** Legacy department workspace — Reports + Feedbacks on the department tab row. */
export function LegacyDepartmentWorkspace({
  unitId,
  unitName,
  canManage,
  members,
  unitAccess,
}: {
  unitId: string;
  unitName: string;
  canManage: boolean;
  members: Array<{ memberId: string; member: MemberRef }>;
  unitAccess?: ServiceUnitAccessFlags;
}) {
  const [tab, setTab] = useState<LegacyTab>('dashboard');
  const { memberId, unitAdminUnitIds, unitLeaderUnitIds } = useModuleAccess();

  const { data: accessFetched } = useApiQuery<ServiceUnitAccessFlags>(
    ['service-unit-access', unitId, memberId ?? 'guest'],
    `/service-units/${unitId}/access`,
  );

  const access = accessFetched ?? unitAccess;

  const canLeadershipHub = Boolean(
    access?.canViewFeedbacks ||
      unitAccess?.canViewFeedbacks ||
      unitAdminUnitIds.includes(unitId) ||
      unitLeaderUnitIds.includes(unitId),
  );

  const tabs = useMemo(() => {
    const items: DepartmentTabItem[] = [
      { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    ];
    if (canLeadershipHub) {
      items.push(...LEADERSHIP_TABS);
    }
    return items;
  }, [canLeadershipHub]);

  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) {
      setTab((tabs[0]?.id as LegacyTab) ?? 'dashboard');
    }
  }, [tabs, tab]);

  return (
    <DepartmentLayout
      title={unitName}
      subtitle="Service unit workspace"
      departmentCode="OTHER"
      accessLabel={
        access?.canManage
          ? 'Unit admin'
          : access?.canLead
            ? 'Unit leader'
            : 'Member'
      }
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => setTab(id as LegacyTab)}
    >
      {tab === 'dashboard' && (
        <DepartmentDashboardPanel
          unitId={unitId}
          canManage={canManage}
          canRecordAttendance={canManage || (access?.canLead ?? false)}
          members={members}
          showSummaryCards
        />
      )}
      {tab === 'reports' && canLeadershipHub && (
        <DepartmentReportsSection unitId={unitId} canEdit={canLeadershipHub} />
      )}
      {tab === 'feedbacks' && canLeadershipHub && (
        <DepartmentFeedbacksSection unitId={unitId} canReply={canLeadershipHub} />
      )}
    </DepartmentLayout>
  );
}
