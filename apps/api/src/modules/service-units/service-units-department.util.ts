/** Monday 00:00 UTC for the week containing `date`. */
export function weekStartUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function isoWeekKey(date: Date): string {
  const ws = weekStartUtc(date);
  const year = ws.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const weekNum = Math.ceil(((ws.getTime() - jan1.getTime()) / 86400000 + jan1.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}
