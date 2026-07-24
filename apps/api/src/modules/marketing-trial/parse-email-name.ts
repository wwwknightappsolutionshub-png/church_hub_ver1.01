/** Parse first/last name from email local-part when structured (john.doe@…). */
export function parseNameFromEmailLocalPart(
  email: string,
): { firstName: string; lastName: string } | null {
  const local = (email.split('@')[0] ?? '').trim();
  if (!local) return null;

  const parts = local
    .split(/[._+\-]+/)
    .map((p) => p.replace(/[^a-zA-Z]/g, ''))
    .filter((p) => p.length >= 2);

  if (parts.length < 2) return null;
  if (!parts.every((p) => /^[a-zA-Z]+$/.test(p))) return null;

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  return {
    firstName: capitalize(parts[0]),
    lastName: capitalize(parts[1]),
  };
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}
