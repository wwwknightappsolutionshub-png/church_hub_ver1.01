export const CELL_DEPUTY_ROLES = ['ASSISTANT', 'SECRETARY'] as const;
export type CellDeputyRole = (typeof CELL_DEPUTY_ROLES)[number];

export const CELL_DEPUTY_SCOPES = ['BRANCH', 'PROVINCE'] as const;
export type CellDeputyScope = (typeof CELL_DEPUTY_SCOPES)[number];

export function isCellDeputyRole(value: string | null | undefined): value is CellDeputyRole {
  const r = (value ?? '').trim().toUpperCase();
  return r === 'ASSISTANT' || r === 'SECRETARY';
}

export function normalizeCellDeputyRole(value: string): CellDeputyRole {
  const r = value.trim().toUpperCase();
  if (r === 'ASSISTANT' || r === 'SECRETARY') return r;
  throw new Error(`Invalid cell deputy role: ${value}`);
}
