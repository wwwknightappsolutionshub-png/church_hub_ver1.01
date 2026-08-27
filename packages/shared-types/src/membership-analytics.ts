/** Phase 5+ — Growth trends & analytics dashboard (no giving) with filters A–E. */

export type MembershipAnalyticsAgeBand =
  | '0-12'
  | '13-17'
  | '18-29'
  | '30-49'
  | '50-64'
  | '65+'
  | 'UNKNOWN';

export type MembershipAnalyticsServiceType = 'all' | 'sunday' | 'chop';

export type MembershipAnalyticsFamilyFilter = 'all' | 'with_family' | 'no_family';

export interface MembershipAnalyticsFiltersDto {
  months?: number;
  dateFrom?: string;
  dateTo?: string;
  compare?: boolean;
  status?: string;
  followUpStage?: string;
  outreachStage?: string;
  serviceUnitId?: string;
  provinceId?: string;
  branchId?: string;
  serviceType?: MembershipAnalyticsServiceType;
  gender?: string;
  ageBand?: MembershipAnalyticsAgeBand;
  family?: MembershipAnalyticsFamilyFilter;
}

export interface MembershipAnalyticsSummary {
  totalMembers: number;
  activeMembers: number;
  outreachContacts: number;
  followUpCompletionRate: number;
  averageAttendanceRate: number;
}

export interface MembershipAnalyticsSummaryDelta {
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

export interface MembershipAnalyticsTargetsDto {
  retentionRate: number | null;
  attendanceRate: number | null;
  outreachCompletionRate: number | null;
  monthlyNewMembers: number | null;
}

export interface MembershipAnalyticsTargetStatusDto {
  key: keyof MembershipAnalyticsTargetsDto;
  label: string;
  target: number | null;
  actual: number;
  met: boolean | null;
  unit: 'rate' | 'count';
}

export interface MembershipAnalyticsDemographicsDto {
  byGender: Array<{ key: string; label: string; count: number }>;
  byAgeBand: Array<{ key: string; label: string; count: number }>;
  byFamily: Array<{ key: string; label: string; count: number }>;
}

export interface MembershipAnalyticsDashboardDto {
  generatedAt: string;
  periodMonths: number;
  range: { start: string; end: string };
  appliedFilters: MembershipAnalyticsFiltersDto;
  summary: MembershipAnalyticsSummary;
  comparison?: {
    priorRange: { start: string; end: string };
    priorSummary: MembershipAnalyticsSummary;
    delta: MembershipAnalyticsSummaryDelta;
  };
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
  demographics: MembershipAnalyticsDemographicsDto;
  targets: MembershipAnalyticsTargetsDto;
  targetStatus: MembershipAnalyticsTargetStatusDto[];
}
