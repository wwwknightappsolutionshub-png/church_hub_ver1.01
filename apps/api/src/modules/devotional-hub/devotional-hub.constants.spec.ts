import { DEVOTIONAL_LEADER_ROLES, MAX_PAGE_SIZE } from './devotional-hub.constants';

describe('devotional-hub.constants', () => {
  it('leader roles include pastoral and youth admin', () => {
    expect(DEVOTIONAL_LEADER_ROLES).toContain('PASTOR');
    expect(DEVOTIONAL_LEADER_ROLES).toContain('YOUTH_ADMIN');
  });

  it('max page size caps list endpoints', () => {
    expect(MAX_PAGE_SIZE).toBeGreaterThan(0);
    expect(MAX_PAGE_SIZE).toBeLessThanOrEqual(100);
  });
});
