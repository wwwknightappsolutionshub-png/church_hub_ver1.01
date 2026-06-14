'use client';

import dynamic from 'next/dynamic';
import type { MembershipAnalyticsDashboardDto } from '@church-hub/shared-types';
import { DashboardPageSkeleton } from '@/components/dashboard/DashboardPageSkeleton';

function panelFallback() {
  return <DashboardPageSkeleton cards={2} />;
}

export const LazyFamiliesPanel = dynamic(
  () => import('@/components/membership/FamiliesPanel').then((m) => m.FamiliesPanel),
  { loading: panelFallback },
);

export const LazyClassesPanel = dynamic(
  () => import('@/components/membership/ClassesPanel').then((m) => m.ClassesPanel),
  { loading: panelFallback },
);

export const LazyAttendancePanel = dynamic(
  () => import('@/components/membership/AttendancePanel').then((m) => m.AttendancePanel),
  { loading: panelFallback },
);

export const LazyMemberDetailPanel = dynamic(
  () => import('@/components/membership/MemberDetailPanel').then((m) => m.MemberDetailPanel),
  { loading: panelFallback },
);

export const LazyMembershipImportWizard = dynamic(
  () =>
    import('@/components/membership/MembershipImportWizard').then((m) => m.MembershipImportWizard),
  { loading: panelFallback },
);

export const LazyMemberOnboardingWizard = dynamic(
  () => import('@/components/membership/MemberOnboardingWizard').then((m) => m.MemberOnboardingWizard),
  { loading: panelFallback },
);

export const LazyCongregantEditorForm = dynamic(
  () => import('@/components/membership/CongregantEditorForm').then((m) => m.CongregantEditorForm),
  { loading: panelFallback },
);

export const LazyFamilyEditorDialog = dynamic(
  () => import('@/components/membership/FamilyEditorDialog').then((m) => m.FamilyEditorDialog),
  { loading: panelFallback },
);

export const LazyMembershipRegistrySettingsPanel = dynamic(
  () =>
    import('@/components/membership/MembershipRegistrySettingsPanel').then(
      (m) => m.MembershipRegistrySettingsPanel,
    ),
  { loading: panelFallback },
);

const AnalyticsCharts = dynamic(
  () => import('@/components/membership/AnalyticsChartsSection').then((m) => m.AnalyticsChartsSection),
  { loading: () => <DashboardPageSkeleton cards={4} />, ssr: false },
);

export function LazyAnalyticsCharts({ dash }: { dash: MembershipAnalyticsDashboardDto }) {
  return <AnalyticsCharts dash={dash} />;
}

export const LazyMembershipAutomationHub = dynamic(
  () => import('@/components/automation/MembershipAutomationHub').then((m) => m.MembershipAutomationHub),
  { loading: panelFallback },
);

export const LazyDepartmentDashboardPanel = dynamic(
  () =>
    import('@/components/service-units/DepartmentDashboardPanel').then(
      (m) => m.DepartmentDashboardPanel,
    ),
  { loading: panelFallback },
);

export const LazyDepartmentModulePanel = dynamic(
  () =>
    import('@/components/departments/DepartmentModulePanel').then((m) => m.DepartmentModulePanel),
  { loading: panelFallback },
);
