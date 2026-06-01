/** ISO week key e.g. 2026-W22 */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function weekRangeFromKey(weekKey: string): { start: Date; end: Date } {
  const match = /^(\d{4})-W(\d{2})$/.exec(weekKey);
  if (!match) {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }
  const year = parseInt(match[1], 10);
  const week = parseInt(match[2], 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const end = new Date(monday);
  end.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end };
}

export function buildWeeklySuggestions(input: {
  completed: number;
  skipped: number;
  pending: number;
  planDaysCompleted: number;
  streakDays: number;
}): string[] {
  const total = input.completed + input.skipped + input.pending;
  const suggestions: string[] = [];

  if (total === 0) {
    suggestions.push('Add one small action point for this week to build momentum.');
    return suggestions;
  }

  const skipRate = total > 0 ? input.skipped / total : 0;
  if (skipRate > 0.4) {
    suggestions.push('Consider fewer, more specific action points you can finish in one sitting.');
  }
  if (input.pending > 2) {
    suggestions.push('Move overdue items to next week or mark them skipped to keep your review honest.');
  }
  if (input.completed >= 5) {
    suggestions.push('Strong week — consider inviting someone from your group to join a church challenge.');
  }
  if (input.planDaysCompleted < 3 && input.streakDays < 2) {
    suggestions.push('Pair daily reading with one concrete action point the same day.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Keep your current rhythm; adjust reminder times if you missed notifications.');
  }
  return suggestions;
}
