/** Local-time greeting for dashboard headers. */
export function timeOfDayGreeting(date = new Date()): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Prefer first name for greetings; fall back to a short display label. */
export function greetingDisplayName(
  user?: { firstName?: string | null; nickname?: string | null } | null,
  member?: { firstName?: string | null; nickname?: string | null } | null,
  fallback = 'there',
): string {
  const nick = user?.nickname?.trim() || member?.nickname?.trim();
  if (nick) return nick.split(/\s+/)[0] ?? nick;
  const first = (user?.firstName ?? member?.firstName ?? '').trim();
  if (first) return first;
  return fallback;
}

export function personalGreeting(
  user?: { firstName?: string | null; nickname?: string | null } | null,
  member?: { firstName?: string | null; nickname?: string | null } | null,
  date = new Date(),
): string {
  return `${timeOfDayGreeting(date)}, ${greetingDisplayName(user, member)}`;
}
