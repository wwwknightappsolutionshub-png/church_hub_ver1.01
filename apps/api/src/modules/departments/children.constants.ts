export type ChildrenClassCode = string;
/** @deprecated Use ChildrenClassCode — classes are now configurable per service unit. */
export type ChildrenClassGroup = ChildrenClassCode;

export const CHILDREN_MINISTRY_INTEREST = "Children's Church";
export const CHILDREN_MAX_AGE = 12;

export interface ChildrenClassDefinitionLike {
  code: string;
  label: string;
  ages: string;
  minAge: number;
  maxAge: number;
}

export const DEFAULT_CHILDREN_CLASS_GROUPS: ChildrenClassDefinitionLike[] = [
  { code: 'AGES_3_5', label: 'Ages 3–5', ages: '3-5', minAge: 3, maxAge: 5 },
  { code: 'AGES_6_9', label: 'Ages 6–9', ages: '6-9', minAge: 6, maxAge: 9 },
  { code: 'AGES_10_12', label: 'Ages 10–12', ages: '10-12', minAge: 10, maxAge: 12 },
];

/** Legacy shape used by older UI code paths. */
export const CHILDREN_CLASS_GROUPS = DEFAULT_CHILDREN_CLASS_GROUPS.map((g) => ({
  value: g.code,
  label: g.label,
  ages: g.ages,
  minAge: g.minAge,
  maxAge: g.maxAge,
}));

export function weekStartUtc(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Parse `<input type="date">` value as a UTC calendar day (Sunday service session). */
export function parseServiceDateInput(serviceDate?: string): Date {
  if (!serviceDate?.trim()) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(serviceDate.trim());
  if (m) {
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0));
  }
  const d = new Date(serviceDate);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid serviceDate');
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function serviceDateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Timestamp on the service calendar day using the current UTC time-of-day. */
export function checkedInAtForServiceDay(serviceDayStart: Date, now = new Date()): Date {
  const at = new Date(serviceDayStart);
  at.setUTCHours(now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), 0);
  return at;
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
export function simplifyLessonForChildren(text: string, classGroup: ChildrenClassCode): string {
  const def = DEFAULT_CHILDREN_CLASS_GROUPS.find((g) => g.code === classGroup);
  const prefix = def ? `[Simple — ${def.label}] ` : `[Simple — ${classGroup}] `;
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

export function memberAgeYears(dateOfBirth: Date, on = new Date()): number {
  const dob = new Date(dateOfBirth);
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

export function classGroupForAge(
  age: number,
  classes: ChildrenClassDefinitionLike[] = DEFAULT_CHILDREN_CLASS_GROUPS,
): ChildrenClassCode | null {
  for (const g of classes) {
    if (age >= g.minAge && age <= g.maxAge) return g.code;
  }
  return null;
}

export function suggestedClassGroup(
  dateOfBirth: Date | null | undefined,
  classes: ChildrenClassDefinitionLike[] = DEFAULT_CHILDREN_CLASS_GROUPS,
): ChildrenClassCode | null {
  if (!dateOfBirth) return null;
  return classGroupForAge(memberAgeYears(new Date(dateOfBirth)), classes);
}

export function isChildrenChurchChild(member: {
  ministryInterests: string[];
  dateOfBirth: Date | null;
}): boolean {
  if (!member.ministryInterests.includes(CHILDREN_MINISTRY_INTEREST)) return false;
  if (!member.dateOfBirth) return true;
  const age = memberAgeYears(new Date(member.dateOfBirth));
  return age >= 0 && age <= CHILDREN_MAX_AGE;
}
