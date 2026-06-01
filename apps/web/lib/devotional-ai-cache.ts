import type {
  DevotionalPrayerPointsDto,
  DevotionalScriptureAnswerDto,
  DevotionalStudyOutlineDto,
} from '@church-hub/shared-types';

const PREFIX = 'devotional-hub:ai:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type DevotionalAiCacheSection = 'outline' | 'prayer' | 'scripture' | 'pdf';

type AiCachePayload =
  | { section: 'outline'; data: DevotionalStudyOutlineDto }
  | { section: 'prayer'; data: DevotionalPrayerPointsDto }
  | { section: 'scripture'; data: DevotionalScriptureAnswerDto }
  | { section: 'pdf'; data: { simplified: string; artifactId?: string } };

export function cacheDevotionalAiResult(payload: AiCachePayload) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `${PREFIX}${payload.section}`,
      JSON.stringify({ cachedAt: Date.now(), ...payload }),
    );
  } catch {
    /* quota */
  }
}

export function readDevotionalAiCache<S extends DevotionalAiCacheSection>(
  section: S,
): Extract<AiCachePayload, { section: S }> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${section}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AiCachePayload & { cachedAt: number };
    if (Date.now() - parsed.cachedAt > MAX_AGE_MS) return null;
    return parsed as unknown as Extract<AiCachePayload, { section: S }>;
  } catch {
    return null;
  }
}

export function clearDevotionalAiCache(section?: DevotionalAiCacheSection) {
  if (typeof window === 'undefined') return;
  const keys = section
    ? [`${PREFIX}${section}`]
    : (['outline', 'prayer', 'scripture', 'pdf'] as const).map((s) => `${PREFIX}${s}`);
  keys.forEach((k) => localStorage.removeItem(k));
}
