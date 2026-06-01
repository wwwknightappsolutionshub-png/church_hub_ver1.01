import { DEMO_METRICS } from '@/lib/demo-data';

export interface DashboardMetrics {
  membership: { total: number; byStatus: Array<{ status: string; _count: number }> };
  followUp: { completionRate: number };
  evangelism: { totalContacts: number };
  youth: { activeGroups: number };
  business: { verifiedProfiles: number };
  bus: { activeRides: number };
}

function countFromGroup(row: { _count?: number | { _all?: number } }): number {
  const c = row._count;
  if (typeof c === 'number') return c;
  if (c && typeof c === 'object' && typeof c._all === 'number') return c._all;
  return 0;
}

type RawDashboard = Partial<DashboardMetrics> & {
  membership?: { total?: number; byStatus?: Array<{ status: string; _count?: number | { _all?: number } }> };
  followUp?: { completionRate?: number };
  evangelism?: { totalContacts?: number };
  youth?: { activeGroups?: number };
  business?: { verifiedProfiles?: number };
  bus?: { activeRides?: number };
};

/** Normalize API payload (Prisma groupBy shapes) for the overview dashboard. */
export function normalizeDashboardMetrics(raw: unknown): DashboardMetrics {
  const d: RawDashboard =
    raw !== null && typeof raw === 'object' ? (raw as RawDashboard) : {};

  const byStatus = (d.membership?.byStatus ?? []).map((s) => ({
    status: s.status,
    _count: countFromGroup(s),
  }));

  return {
    membership: {
      total: d.membership?.total ?? DEMO_METRICS.membership.total,
      byStatus: byStatus.length > 0 ? byStatus : DEMO_METRICS.membership.byStatus,
    },
    followUp: {
      completionRate:
        typeof d.followUp?.completionRate === 'number'
          ? d.followUp.completionRate
          : DEMO_METRICS.followUp.completionRate,
    },
    evangelism: {
      totalContacts: d.evangelism?.totalContacts ?? DEMO_METRICS.evangelism.totalContacts,
    },
    youth: { activeGroups: d.youth?.activeGroups ?? DEMO_METRICS.youth.activeGroups },
    business: {
      verifiedProfiles: d.business?.verifiedProfiles ?? DEMO_METRICS.business.verifiedProfiles,
    },
    bus: { activeRides: d.bus?.activeRides ?? DEMO_METRICS.bus.activeRides },
  };
}
