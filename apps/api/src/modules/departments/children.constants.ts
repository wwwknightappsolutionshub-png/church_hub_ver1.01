export type ChildrenClassGroup = 'AGES_3_5' | 'AGES_6_9' | 'AGES_10_12';

export const CHILDREN_CLASS_GROUPS: Array<{ value: ChildrenClassGroup; label: string; ages: string }> = [
  { value: 'AGES_3_5', label: 'Ages 3–5', ages: '3-5' },
  { value: 'AGES_6_9', label: 'Ages 6–9', ages: '6-9' },
  { value: 'AGES_10_12', label: 'Ages 10–12', ages: '10-12' },
];

export function weekStartUtc(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Parse `<input type="date">` value (YYYY-MM-DD) without local timezone drift. */
export function parseWeekStartInput(weekStart?: string): Date {
  if (!weekStart?.trim()) return weekStartUtc();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStart.trim());
  if (m) {
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
    return weekStartUtc(d);
  }
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid weekStart date');
  return weekStartUtc(d);
}

export function isoWeekKey(weekStart: Date): string {
  return weekStart.toISOString().slice(0, 10);
}

/** Heuristic lesson simplification for children's teachers (no external AI required). */
export function simplifyLessonForChildren(text: string, classGroup: ChildrenClassGroup): string {
  const prefix =
    classGroup === 'AGES_3_5'
      ? '[Simple — ages 3–5] '
      : classGroup === 'AGES_6_9'
        ? '[Simple — ages 6–9] '
        : '[Simple — ages 10–12] ';
  let out = text
    .replace(/\btherefore\b/gi, 'so')
    .replace(/\bnevertheless\b/gi, 'but')
    .replace(/\bconsequently\b/gi, 'then');
  if (classGroup === 'AGES_3_5') {
    out = out.replace(/\b\w{12,}\b/g, (w) => (w.length > 12 ? `${w.slice(0, 8)}…` : w));
  }
  const max = classGroup === 'AGES_3_5' ? 800 : classGroup === 'AGES_6_9' ? 1200 : 2000;
  if (out.length > max) out = `${out.slice(0, max)}…`;
  return `${prefix}${out}`;
}
