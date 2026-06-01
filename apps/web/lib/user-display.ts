export interface DisplayNameSource {
  nickname?: string | null;
  firstName?: string;
  lastName?: string;
}

/** Preferred label: nickname → full name → fallback */
export function userDisplayName(
  user: DisplayNameSource | null | undefined,
  member?: DisplayNameSource | null,
  fallback = 'Member',
): string {
  const nick = user?.nickname?.trim() || member?.nickname?.trim();
  if (nick) return nick;
  const first = user?.firstName ?? member?.firstName ?? '';
  const last = user?.lastName ?? member?.lastName ?? '';
  const full = `${first} ${last}`.trim();
  return full || fallback;
}

export function accountAvatarUrl(
  user?: { avatarUrl?: string | null } | null,
  member?: { avatarUrl?: string | null } | null,
): string | null {
  return user?.avatarUrl?.trim() || member?.avatarUrl?.trim() || null;
}
