/** Phase 5 — Growth trends & analytics dashboard (no giving). */

export interface MembershipAnalyticsSummary {
  totalMembers: number;
  activeMembers: number;
  outreachContacts: number;
  followUpCompletionRate: number;
  averageAttendanceRate: number;
}

export interface MembershipGrowthTrends {
  memberGrowth: Array<{ period: string; total: number; newInPeriod: number }>;
  newConvertGrowth: Array<{ period: string; outreachContacts: number; newMembers: number }>;
  firstTimerRetention: Array<{
    period: string;
    newVisitors: number;
    retained: number;
    retentionRate: number;
  }>;
}

export interface MembershipAnalyticsDashboardDto {
  generatedAt: string;
  periodMonths: number;
  summary: MembershipAnalyticsSummary;
  growthTrends: MembershipGrowthTrends;
  absenteeTrends: Array<{ period: string; absent: number; present: number; rate: number }>;
  attendancePerformance: Array<{ period: string; present: number; absent: number; rate: number }>;
  departmentPerformance: Array<{
    serviceUnitId: string;
    name: string;
    present: number;
    absent: number;
    rate: number;
  }>;
  followUpCompleteness: Array<{
    period: string;
    created: number;
    completed: number;
    completionRate: number;
  }>;
  followUpByStage: Array<{ stage: string; count: number }>;
}
