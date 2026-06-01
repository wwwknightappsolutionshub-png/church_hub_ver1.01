export const WISDOM365_VARIANT_SLUGS = [
  'BUSINESS_OWNERS',
  'STUDENTS',
  'YOUTHS',
  'KIDS',
  'HUSBANDS',
  'WIVES',
] as const;

export type Wisdom365VariantSlug = (typeof WISDOM365_VARIANT_SLUGS)[number];

export const WISDOM365_VARIANT_LABELS: Record<Wisdom365VariantSlug, string> = {
  BUSINESS_OWNERS: 'Business Owners',
  STUDENTS: 'Students',
  YOUTHS: 'Youths',
  KIDS: 'Kids',
  HUSBANDS: 'Husbands',
  WIVES: 'Wives',
};

export type Wisdom365SubscriptionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED';

export interface Wisdom365ProductConfigDto {
  licensePricePence: number;
  multiLicenseDiscountPercent: number;
  multiLicenseMinCount: number;
  currency: string;
  subscriptionDurationDays: number;
  isActive: boolean;
}

export interface Wisdom365VariantDto {
  id: string;
  slug: Wisdom365VariantSlug;
  name: string;
  description: string;
  imageUrl: string;
  bibleTranslationLabel: string;
  bibleTranslationCode: string;
  requiresParentalConsent: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface Wisdom365EntitlementDto {
  variant: Wisdom365VariantDto;
  assignmentId: string;
  subscriptionId: string;
  isKidsManaged?: boolean;
}

export interface Wisdom365SubscriptionSummary {
  id: string;
  licenseCount: number;
  status: Wisdom365SubscriptionStatus;
  periodStart: string | null;
  periodEnd: string | null;
  amountPaidPence: number | null;
  currency: string;
  daysRemaining: number;
  needsRenewal: boolean;
  isExpired: boolean;
}

export interface Wisdom365MeResponse {
  churchModuleEnabled: boolean;
  churchAvailable: boolean;
  activeLicenses: number;
  assignedCount: number;
  unassignedLicenses: number;
  unassignedSubscriptionId: string | null;
  entitlements: Wisdom365EntitlementDto[];
  pendingSubscriptionId: string | null;
  subscriptions: Wisdom365SubscriptionSummary[];
  renewalDue?: boolean;
}

export interface Wisdom365ReminderPref {
  variantSlug: string;
  variantName: string;
  hour: number;
  minute: number;
  alarmEnabled: boolean;
  timezone: string;
}

export interface Wisdom365ChurchInsights {
  activeSubscriptions: number;
  totalLicenses: number;
  assignedJourneys: number;
  completionsLast7Days: number;
  byVariant: Array<{ slug: string; name: string; count: number }>;
}

export interface Wisdom365CheckoutQuote {
  licenseCount: number;
  unitPricePence: number;
  subtotalPence: number;
  discountPercent: number;
  discountPence: number;
  totalPence: number;
  currency: string;
}

export interface Wisdom365DayContentDto {
  dayOfYear: number;
  dateKey: string;
  title: string;
  reference: string;
  passage: string;
  wisdom: string;
  application: string;
  prayer: string;
  theme: string;
  imageUrl: string;
  bibleTranslationLabel: string;
  greeting: string;
  focusLine: string;
  personalWisdom: string;
  personalApplication: string;
  personalPrayer: string;
  audioScript: string;
  canView: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const WISDOM365_HISTORY_DAYS = 30;
