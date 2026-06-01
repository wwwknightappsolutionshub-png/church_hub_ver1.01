/** UTC date at midnight for streak keys */
export function dateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(`${dateKey(d)}T00:00:00.000Z`);
}

export function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function computeStreakFromLogs(prayedDates: Date[]): {
  streakDays: number;
  longestStreak: number;
  lastPrayedOn: Date | null;
} {
  if (prayedDates.length === 0) {
    return { streakDays: 0, longestStreak: 0, lastPrayedOn: null };
  }

  const sorted = [...prayedDates]
    .map((d) => startOfUtcDay(d).getTime())
    .sort((a, b) => b - a);
  const unique = [...new Set(sorted)];

  let longest = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    const diffDays = (unique[i - 1] - unique[i]) / 86400000;
    if (diffDays === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const today = startOfUtcDay().getTime();
  const yesterday = addUtcDays(startOfUtcDay(), -1).getTime();
  let streak = 0;
  if (unique[0] === today || unique[0] === yesterday) {
    streak = 1;
    for (let i = 1; i < unique.length; i++) {
      if (unique[i - 1] - unique[i] === 86400000) streak += 1;
      else break;
    }
  }

  return {
    streakDays: streak,
    longestStreak: longest,
    lastPrayedOn: new Date(unique[0]),
  };
}
