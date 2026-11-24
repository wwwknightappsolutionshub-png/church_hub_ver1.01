import { AsyncLocalStorage } from 'async_hooks';

export type TenantContextStore = {
  churchId?: string | null;
  /** Skip deletedAt filtering (trash/restore/admin include-deleted). */
  includeDeleted?: boolean;
  /** Skip churchId injection (platform jobs, migrations helpers). */
  bypassTenantScope?: boolean;
  /** When ENABLE_DB_RLS=true, also set app.bypass_rls. */
  bypassRls?: boolean;
};

const als = new AsyncLocalStorage<TenantContextStore>();

export function getTenantContext(): TenantContextStore {
  return als.getStore() ?? {};
}

/** Prefer for Nest interceptors — binds context for the rest of the async resource. */
export function enterTenantContext(ctx: TenantContextStore) {
  als.enterWith({ ...getTenantContext(), ...ctx });
}

export function runWithTenantContext<T>(ctx: TenantContextStore, fn: () => T): T {
  return als.run({ ...getTenantContext(), ...ctx }, fn);
}

export async function runWithTenantContextAsync<T>(
  ctx: TenantContextStore,
  fn: () => Promise<T>,
): Promise<T> {
  return als.run({ ...getTenantContext(), ...ctx }, fn);
}

export function runWithTenantBypass<T>(fn: () => T): T {
  return runWithTenantContext({ bypassTenantScope: true, bypassRls: true, includeDeleted: true }, fn);
}

export async function runWithTenantBypassAsync<T>(fn: () => Promise<T>): Promise<T> {
  return runWithTenantContextAsync(
    { bypassTenantScope: true, bypassRls: true, includeDeleted: true },
    fn,
  );
}
