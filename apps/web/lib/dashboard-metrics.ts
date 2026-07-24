export interface DashboardMetrics {
  membership: {
    total: number;
    byStatus: Array<{ status: string; _count: number }>;
    changePct: number;
    addedThisMonth: number;
  };
  followUp: {
    completionRate: number;
    pending: number;
    completed: number;
  };
  evangelism: {
    totalContacts: number;
    thisMonth: number;
    changePct: number;
  };
  youth: { activeGroups: number };
  business: { verifiedProfiles: number };
  bus: { activeRides: number; completedToday: number };
  growth: Array<{ month: string; members: number; outreach: number }>;
}

function countFromGroup(row: { _count?: number | { _all?: number } }): number {
  const c = row._count;
  if (typeof c === 'number') return c;
  if (c && typeof c === 'object' && typeof c._all === 'number') return c._all;
  return 0;
}

const EMPTY_METRICS: DashboardMetrics = {
  membership: { total: 0, byStatus: [], changePct: 0, addedThisMonth: 0 },
  followUp: { completionRate: 0, pending: 0, completed: 0 },
  evangelism: { totalContacts: 0, thisMonth: 0, changePct: 0 },
  youth: { activeGroups: 0 },
  business: { verifiedProfiles: 0 },
  bus: { activeRides: 0, completedToday: 0 },
  growth: [],
};

type RawDashboard = Partial<{
  membership: {
    total?: number;
    byStatus?: Array<{ status: string; _count?: number | { _all?: number } }>;
    changePct?: number;
    addedThisMonth?: number;
  };
  followUp: {
    completionRate?: number;
    pending?: number;
    completed?: number;
  };
  evangelism: {
    totalContacts?: number;
    thisMonth?: number;
    changePct?: number;
  };
  youth: { activeGroups?: number };
  business: { verifiedProfiles?: number };
  bus: { activeRides?: number; completedToday?: number };
  growth?: Array<{ month?: string; members?: number; outreach?: number }>;
}>;

/** Normalize API payload (Prisma groupBy shapes) for the overview dashboard. Never injects demo numbers. */
export function normalizeDashboardMetrics(raw: unknown): DashboardMetrics {
  if (raw === null || typeof raw !== 'object') return { ...EMPTY_METRICS, growth: [] };

  const d = raw as RawDashboard;
  const byStatus = (d.membership?.byStatus ?? []).map((s) => ({
    status: s.status,
    _count: countFromGroup(s),
  }));

  const growth = (d.growth ?? [])
    .filter((g) => g && typeof g.month === 'string')
    .map((g) => ({
      month: g.month as string,
      members: typeof g.members === 'number' ? g.members : 0,
      outreach: typeof g.outreach === 'number' ? g.outreach : 0,
    }));

  return {
    membership: {
      total: d.membership?.total ?? 0,
      byStatus,
      changePct: typeof d.membership?.changePct === 'number' ? d.membership.changePct : 0,
      addedThisMonth:
        typeof d.membership?.addedThisMonth === 'number' ? d.membership.addedThisMonth : 0,
    },
    followUp: {
      completionRate:
        typeof d.followUp?.completionRate === 'number' ? d.followUp.completionRate : 0,
      pending: typeof d.followUp?.pending === 'number' ? d.followUp.pending : 0,
      completed: typeof d.followUp?.completed === 'number' ? d.followUp.completed : 0,
    },
    evangelism: {
      totalContacts: d.evangelism?.totalContacts ?? 0,
      thisMonth: typeof d.evangelism?.thisMonth === 'number' ? d.evangelism.thisMonth : 0,
      changePct: typeof d.evangelism?.changePct === 'number' ? d.evangelism.changePct : 0,
    },
    youth: { activeGroups: d.youth?.activeGroups ?? 0 },
    business: { verifiedProfiles: d.business?.verifiedProfiles ?? 0 },
    bus: {
      activeRides: d.bus?.activeRides ?? 0,
      completedToday: typeof d.bus?.completedToday === 'number' ? d.bus.completedToday : 0,
    },
    growth,
  };
}
