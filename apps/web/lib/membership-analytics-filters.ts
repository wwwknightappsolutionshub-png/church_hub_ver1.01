import type { MembershipAnalyticsFiltersDto } from '@church-hub/shared-types';

export type AnalyticsUiFilters = {
  months: number;
  dateFrom: string;
  dateTo: string;
  compare: boolean;
  status: string;
  followUpStage: string;
  outreachStage: string;
  serviceUnitId: string;
  provinceId: string;
  branchId: string;
  serviceType: 'all' | 'sunday' | 'chop';
  gender: string;
  ageBand: string;
  family: 'all' | 'with_family' | 'no_family';
};

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsUiFilters = {
  months: 6,
  dateFrom: '',
  dateTo: '',
  compare: false,
  status: 'all',
  followUpStage: 'all',
  outreachStage: 'all',
  serviceUnitId: '',
  provinceId: '',
  branchId: '',
  serviceType: 'all',
  gender: 'all',
  ageBand: 'all',
  family: 'all',
};

export function analyticsFiltersToQuery(filters: AnalyticsUiFilters): string {
  const params = new URLSearchParams();
  params.set('months', String(filters.months));
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.compare) params.set('compare', 'true');
  if (filters.status !== 'all') params.set('status', filters.status);
  if (filters.followUpStage !== 'all') params.set('followUpStage', filters.followUpStage);
  if (filters.outreachStage !== 'all') params.set('outreachStage', filters.outreachStage);
  if (filters.serviceUnitId) params.set('serviceUnitId', filters.serviceUnitId);
  if (filters.provinceId) params.set('provinceId', filters.provinceId);
  if (filters.branchId) params.set('branchId', filters.branchId);
  if (filters.serviceType !== 'all') params.set('serviceType', filters.serviceType);
  if (filters.gender !== 'all') params.set('gender', filters.gender);
  if (filters.ageBand !== 'all') params.set('ageBand', filters.ageBand);
  if (filters.family !== 'all') params.set('family', filters.family);
  return params.toString();
}

export function analyticsFiltersCacheKey(filters: AnalyticsUiFilters): string[] {
  return ['membership-analytics', analyticsFiltersToQuery(filters)];
}

export function appliedFiltersHint(applied?: MembershipAnalyticsFiltersDto): string {
  if (!applied) return '';
  const bits: string[] = [];
  if (applied.dateFrom && applied.dateTo) bits.push(`${applied.dateFrom} → ${applied.dateTo}`);
  else if (applied.months) bits.push(`${applied.months} mo`);
  if (applied.compare) bits.push('vs prior');
  if (applied.status) bits.push(applied.status.replace(/_/g, ' '));
  if (applied.serviceType && applied.serviceType !== 'all') bits.push(applied.serviceType);
  return bits.join(' · ');
}
