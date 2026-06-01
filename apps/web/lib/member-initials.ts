/** First letter of first name + first letter of last name (e.g. Segun Ojo → SO). */
export function memberInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) {
    const word = parts[0];
    return word.length >= 2 ? word.slice(0, 2).toUpperCase() : word[0]?.toUpperCase() ?? '?';
  }
  const first = parts[0][0] ?? '';
  const last = parts[parts.length - 1][0] ?? '';
  return `${first}${last}`.toUpperCase();
}
