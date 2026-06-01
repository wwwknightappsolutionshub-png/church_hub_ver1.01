import type {
  DevotionalHubContext,
  DevotionalPlanDto,
  DevotionalTodayDto,
} from '@church-hub/shared-types';

const PLANS_KEY = 'devotional-hub:plans';
const CONTEXT_KEY = 'devotional-hub:context';
const TODAY_PREFIX = 'devotional-hub:today:';

export const DEVOTIONAL_CACHE_TTL = {
  plans: 7 * 24 * 60 * 60 * 1000,
  today: 24 * 60 * 60 * 1000,
  context: 60 * 60 * 1000,
} as const;

type CachedEnvelope<T> = { cachedAt: number; data: T };

function writeJson(key: string, envelope: CachedEnvelope<unknown>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    /* quota */
  }
}

function readJson<T>(key: string, maxAgeMs?: number): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedEnvelope<T> & { items?: T };
    if (maxAgeMs && parsed.cachedAt && Date.now() - parsed.cachedAt > maxAgeMs) {
      return null;
    }
    if ('data' in parsed && parsed.data !== undefined) return parsed.data as T;
    // Legacy envelope from Phase 1–10
    if ('items' in parsed && (parsed as { items?: T }).items !== undefined) {
      return (parsed as { items: T }).items;
    }
    return null;
  } catch {
    return null;
  }
}

export function cacheDevotionalPlans(items: DevotionalPlanDto[]) {
  writeJson(PLANS_KEY, { cachedAt: Date.now(), data: items });
}

export function readCachedDevotionalPlans(): DevotionalPlanDto[] | null {
  return readJson<DevotionalPlanDto[]>(PLANS_KEY, DEVOTIONAL_CACHE_TTL.plans);
}

export function cacheDevotionalToday(planId: string, data: DevotionalTodayDto) {
  writeJson(`${TODAY_PREFIX}${planId}`, { cachedAt: Date.now(), data });
}

export function readCachedDevotionalToday(planId: string): DevotionalTodayDto | null {
  return readJson<DevotionalTodayDto>(`${TODAY_PREFIX}${planId}`, DEVOTIONAL_CACHE_TTL.today);
}

export function cacheDevotionalContext(ctx: DevotionalHubContext) {
  writeJson(CONTEXT_KEY, { cachedAt: Date.now(), data: ctx });
}

export function readCachedDevotionalContext(): DevotionalHubContext | null {
  return readJson<DevotionalHubContext>(CONTEXT_KEY, DEVOTIONAL_CACHE_TTL.context);
}

export function isDevotionalOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}
