import { describe, expect, it } from 'vitest';
import { YOUTH_FEATURES } from './features';

describe('YOUTH_FEATURES', () => {
  it('includes all primary youth routes', () => {
    const keys = YOUTH_FEATURES.map((f) => f.key);
    expect(keys).toContain('feed');
    expect(keys).toContain('chat');
    expect(keys).toContain('events');
    expect(keys).toContain('qa');
    expect(keys).toContain('prayer');
    expect(keys).toContain('gamification');
  });
});
