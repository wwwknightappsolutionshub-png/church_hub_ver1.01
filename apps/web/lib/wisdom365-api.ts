import type {
  Wisdom365CheckoutQuote,
  Wisdom365ChurchInsights,
  Wisdom365DayContentDto,
  Wisdom365MeResponse,
  Wisdom365ReminderPref,
  Wisdom365VariantDto,
  Wisdom365VariantSlug,
} from '@church-hub/shared-types';
import { api } from '@/lib/api';

export interface Wisdom365CatalogResponse {
  variants: Wisdom365VariantDto[];
  me: Wisdom365MeResponse;
  product: {
    licensePricePence: number;
    multiLicenseDiscountPercent: number;
    multiLicenseMinCount: number;
    currency: string;
    subscriptionDurationDays: number;
    isActive: boolean;
  } | null;
  sampleQuote: Wisdom365CheckoutQuote;
}

export interface Wisdom365CheckoutResponse {
  subscriptionId: string;
  quote: Wisdom365CheckoutQuote;
  checkoutUrl: string | null;
  devMode: boolean;
}

export interface Wisdom365HistoryItem {
  dayOfYear: number;
  title: string;
  reference: string;
  theme: string;
  imageUrl: string;
  isToday: boolean;
}

export interface Wisdom365Progress {
  streak: number;
  completedToday: boolean;
  reminder: {
    hour: number;
    minute: number;
    alarmEnabled: boolean;
    timezone: string;
  } | null;
  dayOfYear: number;
}

export interface FamilyChild {
  id: string;
  displayName: string;
  dateOfBirth: string | null;
}

export function formatPence(pence: number, currency = 'GBP') {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(pence / 100);
}

export async function fetchWisdom365Catalog() {
  const { data } = await api.get<Wisdom365CatalogResponse>('/wisdom365/catalog');
  return data;
}

export async function fetchWisdom365Me() {
  const { data } = await api.get<Wisdom365MeResponse>('/wisdom365/me');
  return data;
}

export async function createWisdom365Checkout(licenseCount: number) {
  const { data } = await api.post<Wisdom365CheckoutResponse>('/wisdom365/checkout', {
    licenseCount,
  });
  return data;
}

export async function completeDevCheckout(subscriptionId: string) {
  const { data } = await api.post<{ subscriptionId: string; status: string; licenseCount?: number }>(
    '/wisdom365/checkout/complete-dev',
    { subscriptionId },
  );
  return data;
}

export async function assignWisdom365Variants(payload: {
  subscriptionId: string;
  variantSlugs: Wisdom365VariantSlug[];
  kidsGrants?: Array<{ childMemberId: string; childDisplayName: string }>;
}) {
  const { data } = await api.post('/wisdom365/assign', payload);
  return data;
}

export async function fetchFamilyChildren() {
  const { data } = await api.get<FamilyChild[]>('/wisdom365/family-children');
  return data;
}

export async function fetchReminderPrefs() {
  const { data } = await api.get<Wisdom365ReminderPref[]>('/wisdom365/reminders');
  return data;
}

export async function fetchChurchInsights() {
  const { data } = await api.get<Wisdom365ChurchInsights>('/wisdom365/insights/church');
  return data;
}

export async function fetchTodayContent(slug: string, firstName: string) {
  const { data } = await api.get<Wisdom365DayContentDto>(
    `/wisdom365/journeys/${slug}/today`,
    { params: { firstName } },
  );
  return data;
}

export async function fetchDayContent(slug: string, dayOfYear: number, firstName: string) {
  const { data } = await api.get<Wisdom365DayContentDto>(
    `/wisdom365/journeys/${slug}/days/${dayOfYear}`,
    { params: { firstName } },
  );
  return data;
}

export async function fetchHistory(slug: string) {
  const { data } = await api.get<Wisdom365HistoryItem[]>(`/wisdom365/journeys/${slug}/history`);
  return data;
}

export async function fetchProgress(slug: string) {
  const { data } = await api.get<Wisdom365Progress>(`/wisdom365/journeys/${slug}/progress`);
  return data;
}

export async function markDayComplete(slug: string, journalText?: string) {
  const { data } = await api.post<{ streak: number; completed: boolean }>(
    `/wisdom365/journeys/${slug}/complete`,
    { journalText },
  );
  return data;
}

export async function saveReminder(
  slug: string,
  payload: { hour: number; minute: number; alarmEnabled: boolean; timezone: string },
) {
  const { data } = await api.patch(`/wisdom365/journeys/${slug}/reminder`, payload);
  return data;
}

/** Map API day content to Today card shape */
export function toPersonalDay(day: Wisdom365DayContentDto) {
  return {
    dayOfYear: day.dayOfYear,
    title: day.title,
    reference: day.reference,
    passage: day.passage,
    wisdom: day.wisdom,
    application: day.application,
    prayer: day.prayer,
    theme: day.theme,
    imageUrl: day.imageUrl,
    greeting: day.greeting,
    focusLine: day.focusLine,
    personalWisdom: day.personalWisdom,
    personalApplication: day.personalApplication,
    personalPrayer: day.personalPrayer,
    audioScript: day.audioScript,
  };
}

export function slugToLabel(slug: string) {
  return slug
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
    .replace('Wives', 'Wives')
    .replace('Wife', 'Wives');
}
