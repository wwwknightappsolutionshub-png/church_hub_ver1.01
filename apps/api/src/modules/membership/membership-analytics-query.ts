import {
  FollowUpStage,
  MemberGender,
  MemberStatus,
  OutreachConvertStage,
} from '@prisma/client';
import type { AnalyticsAgeBandKey } from './membership-analytics.util';
import {
  ANALYTICS_AGE_BANDS,
  buildMonthBuckets,
  buildMonthBucketsForRange,
} from './membership-analytics.util';

export type AnalyticsServiceType = 'all' | 'sunday' | 'chop';
export type AnalyticsFamilyFilter = 'all' | 'with_family' | 'no_family';

export interface MembershipAnalyticsQuery {
  months: number;
  dateFrom: Date | null;
  dateTo: Date | null;
  compare: boolean;
  status: MemberStatus | null;
  followUpStage: FollowUpStage | null;
  outreachStage: OutreachConvertStage | null;
  serviceUnitId: string | null;
  provinceId: string | null;
  branchId: string | null;
  serviceType: AnalyticsServiceType;
  gender: MemberGender | null;
  ageBand: AnalyticsAgeBandKey | null;
  family: AnalyticsFamilyFilter;
}

const MEMBER_STATUSES = new Set<string>(Object.values(MemberStatus));
const FOLLOW_UP_STAGES = new Set<string>(Object.values(FollowUpStage));
const OUTREACH_STAGES = new Set<string>(Object.values(OutreachConvertStage));
const GENDERS = new Set<string>(Object.values(MemberGender));
const AGE_KEYS = new Set<string>(ANALYTICS_AGE_BANDS.map((b) => b.key));

function parseIsoDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function asEnum<T extends string>(value: string | undefined, allowed: Set<string>): T | null {
  if (!value?.trim() || value === 'all') return null;
  return allowed.has(value) ? (value as T) : null;
}

export function parseMembershipAnalyticsQuery(
  raw: Record<string, string | undefined>,
): MembershipAnalyticsQuery {
  const months = Math.min(12, Math.max(3, parseInt(raw.months ?? '6', 10) || 6));
  let dateFrom = parseIsoDate(raw.dateFrom);
  let dateTo = parseIsoDate(raw.dateTo);
  if (dateFrom && dateTo && dateFrom > dateTo) {
    const tmp = dateFrom;
    dateFrom = dateTo;
    dateTo = tmp;
  }

  const serviceTypeRaw = (raw.serviceType ?? 'all').toLowerCase();
  const serviceType: AnalyticsServiceType =
    serviceTypeRaw === 'sunday' || serviceTypeRaw === 'chop' ? serviceTypeRaw : 'all';

  const familyRaw = (raw.family ?? 'all').toLowerCase();
  const family: AnalyticsFamilyFilter =
    familyRaw === 'with_family' || familyRaw === 'no_family' ? familyRaw : 'all';

  return {
    months,
    dateFrom,
    dateTo,
    compare: raw.compare === '1' || raw.compare === 'true',
    status: asEnum<MemberStatus>(raw.status, MEMBER_STATUSES),
    followUpStage: asEnum<FollowUpStage>(raw.followUpStage, FOLLOW_UP_STAGES),
    outreachStage: asEnum<OutreachConvertStage>(raw.outreachStage, OUTREACH_STAGES),
    serviceUnitId: raw.serviceUnitId?.trim() || null,
    provinceId: raw.provinceId?.trim() || null,
    branchId: raw.branchId?.trim() || null,
    serviceType,
    gender: asEnum<MemberGender>(raw.gender, GENDERS),
    ageBand: asEnum<AnalyticsAgeBandKey>(raw.ageBand, AGE_KEYS),
    family,
  };
}

export function resolveAnalyticsRange(query: MembershipAnalyticsQuery, now = new Date()) {
  if (query.dateFrom && query.dateTo) {
    const start = new Date(query.dateFrom);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(query.dateTo);
    end.setUTCHours(23, 59, 59, 999);
    const endExclusive = new Date(end.getTime() + 1);
    const months = buildMonthBucketsForRange(start, end);
    return { start, end: endExclusive, periodMonths: months.length, months };
  }
  const months = buildMonthBuckets(query.months, now);
  const start = months[0]?.start ?? now;
  const end = months[months.length - 1]?.end ?? now;
  return { start, end, periodMonths: query.months, months };
}

export function serializeAppliedFilters(query: MembershipAnalyticsQuery) {
  return {
    months: query.months,
    dateFrom: query.dateFrom?.toISOString().slice(0, 10),
    dateTo: query.dateTo?.toISOString().slice(0, 10),
    compare: query.compare,
    status: query.status ?? undefined,
    followUpStage: query.followUpStage ?? undefined,
    outreachStage: query.outreachStage ?? undefined,
    serviceUnitId: query.serviceUnitId ?? undefined,
    provinceId: query.provinceId ?? undefined,
    branchId: query.branchId ?? undefined,
    serviceType: query.serviceType,
    gender: query.gender ?? undefined,
    ageBand: query.ageBand ?? undefined,
    family: query.family,
  };
}
