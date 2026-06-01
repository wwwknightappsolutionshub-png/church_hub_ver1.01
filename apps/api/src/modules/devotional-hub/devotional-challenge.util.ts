export type DefaultMilestone = {
  threshold: number;
  badgeKey: string;
  title: string;
  description?: string;
  sortOrder: number;
};

export function buildDefaultMilestones(targetCount?: number | null): DefaultMilestone[] {
  const target = targetCount ?? 14;
  const steps = [
    { threshold: 1, badgeKey: 'first_step', title: 'First step', description: 'Started the challenge' },
    { threshold: 3, badgeKey: 'steady', title: 'Steady', description: 'Three check-ins' },
    { threshold: 7, badgeKey: 'week_warrior', title: 'Week warrior', description: 'A full week of progress' },
  ];
  if (target >= 10) {
    steps.push({
      threshold: Math.min(target, 14),
      badgeKey: 'finisher',
      title: 'Finisher',
      description: 'Reached the challenge goal',
    });
  }
  return steps.map((s, i) => ({ ...s, sortOrder: i }));
}
