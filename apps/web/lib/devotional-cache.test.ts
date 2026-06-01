import { describe, expect, it } from 'vitest';
import {
  DEVOTIONAL_CACHE_TTL,
  isDevotionalOffline,
} from './devotional-cache';

describe('devotional-cache', () => {
  it('defines TTL buckets', () => {
    expect(DEVOTIONAL_CACHE_TTL.plans).toBeGreaterThan(DEVOTIONAL_CACHE_TTL.today);
  });

  it('isDevotionalOffline reflects navigator when defined', () => {
    expect(typeof isDevotionalOffline()).toBe('boolean');
  });
});
