/** Volunteer unit leadership kinds (stored on ServiceUnitLeader.role when not unit admin). */
export const UNIT_DEPUTY_ROLES = ['ASSISTANT', 'SECRETARY'] as const;
export type UnitDeputyRole = (typeof UNIT_DEPUTY_ROLES)[number];

export type UnitLeaderKind = 'UNIT_ADMIN' | UnitDeputyRole | 'LEADER';

export function normalizeUnitLeaderRole(role: string | null | undefined): string {
  return (role ?? '').trim().toUpperCase();
}

export function isUnitDeputyRole(role: string | null | undefined): role is UnitDeputyRole {
  const r = normalizeUnitLeaderRole(role);
  return r === 'ASSISTANT' || r === 'SECRETARY';
}

export function resolveUnitLeaderKind(
  isUnitAdmin: boolean,
  role: string | null | undefined,
): UnitLeaderKind {
  if (isUnitAdmin) return 'UNIT_ADMIN';
  if (isUnitDeputyRole(role)) return normalizeUnitLeaderRole(role) as UnitDeputyRole;
  return 'LEADER';
}

export function unitRoleFromLeader(
  isUnitAdmin: boolean,
  role: string | null | undefined,
): 'MEMBER' | 'UNIT_ADMIN' | 'ASSISTANT' | 'SECRETARY' {
  const kind = resolveUnitLeaderKind(isUnitAdmin, role);
  if (kind === 'UNIT_ADMIN') return 'UNIT_ADMIN';
  if (kind === 'ASSISTANT') return 'ASSISTANT';
  if (kind === 'SECRETARY') return 'SECRETARY';
  return 'MEMBER';
}
