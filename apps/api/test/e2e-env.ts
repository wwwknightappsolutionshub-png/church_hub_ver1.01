/**
 * E2E skip policy: run when DATABASE_URL is set unless SKIP_E2E=true.
 * No opt-in flags required for local/CI runs.
 */
export function shouldSkipE2e(): boolean {
  if (process.env.SKIP_E2E === 'true') return true;
  if (!process.env.DATABASE_URL?.trim()) return true;
  return false;
}
