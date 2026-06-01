import { describe, expect, it } from 'vitest';
import {
  DEVOTIONAL_HUB_TABS,
  DEVOTIONAL_QUERY_KEYS,
  DEVOTIONAL_QUERY_STALE,
} from './devotional-hub';

describe('devotional-hub config', () => {
  it('exposes all hub tabs including challenges', () => {
    const ids = DEVOTIONAL_HUB_TABS.map((t) => t.id);
    expect(ids).toContain('today');
    expect(ids).toContain('challenges');
    expect(ids).toContain('study');
  });

  it('query keys are stable tuples', () => {
    expect(DEVOTIONAL_QUERY_KEYS.plans()).toEqual(['devotional-plans']);
    expect(DEVOTIONAL_QUERY_KEYS.aiArtifacts('p1')).toEqual(['devotional-ai-artifacts', 'p1']);
  });

  it('stale times favor cached reads', () => {
    expect(DEVOTIONAL_QUERY_STALE.context).toBeGreaterThan(DEVOTIONAL_QUERY_STALE.today);
  });
});
