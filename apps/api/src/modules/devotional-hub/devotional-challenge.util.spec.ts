import { buildDefaultMilestones } from './devotional-challenge.util';

describe('buildDefaultMilestones', () => {
  it('includes finisher when target >= 10', () => {
    const m = buildDefaultMilestones(14);
    expect(m.some((x) => x.badgeKey === 'finisher')).toBe(true);
    expect(m[0].sortOrder).toBe(0);
  });

  it('omits finisher for small targets', () => {
    const m = buildDefaultMilestones(5);
    expect(m.some((x) => x.badgeKey === 'finisher')).toBe(false);
    expect(m).toHaveLength(3);
  });
});
