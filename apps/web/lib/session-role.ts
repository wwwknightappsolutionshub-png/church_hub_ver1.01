/** Persisted role bucket for login/logout routing (survives failed /auth/me on sign-out). */
export type SessionRoleBucket = 'platform' | 'church_admin' | 'pastor' | 'member';

const ROLE_KEY = 'churchHub.sessionRole';
const SAAS_LANDING_KEY = 'churchHub.saasLanding';

/** True SaaS owner (PLATFORM_ADMIN only). */
export function isPlatformAdminRole(
  roles: string[] | undefined,
  isPlatformAdmin?: boolean,
): boolean {
  if (isPlatformAdmin) return true;
  return (roles ?? []).includes('PLATFORM_ADMIN');
}

/** Any platform-scoped operator (owner or custom support role). */
export function isPlatformRole(
  roles: string[] | undefined,
  flags?: boolean | { isPlatformAdmin?: boolean; isPlatformOperator?: boolean },
): boolean {
  if (typeof flags === 'boolean') {
    if (flags) return true;
  } else if (flags?.isPlatformOperator || flags?.isPlatformAdmin) {
    return true;
  }
  if ((roles ?? []).includes('PLATFORM_ADMIN')) return true;
  // Custom platform roles use names other than PLATFORM_ADMIN; operator flag from /auth/me is authoritative.
  return false;
}

export function isChurchAdminRole(roles: string[] | undefined): boolean {
  return (roles ?? []).includes('ADMIN');
}

export function isPastorRole(roles: string[] | undefined): boolean {
  return (roles ?? []).includes('PASTOR');
}

/** Church ADMIN or PASTOR — same staff privileges for tenant operations. */
export function isChurchLeadershipRole(roles: string[] | undefined): boolean {
  return isChurchAdminRole(roles) || isPastorRole(roles);
}

export function isLeaderRole(roles: string[] | undefined): boolean {
  return (roles ?? []).includes('LEADER');
}

/** Church Pastor only — bulk unmasked PII directory export. */
export function canExportOutreachDirectory(roles: string[] | undefined): boolean {
  return isPastorRole(roles);
}

/** Admin / Pastor / Unit Leader may archive immediately. */
export function canArchiveFollowUp(roles: string[] | undefined): boolean {
  return isChurchLeadershipRole(roles) || isLeaderRole(roles);
}

export function resolveSessionRoleBucket(input: {
  userRoles?: string[];
  isPlatformAdmin?: boolean;
  isPlatformOperator?: boolean;
  isChurchStaff?: boolean;
}): SessionRoleBucket {
  const roles = input.userRoles ?? [];
  if (isPlatformRole(roles, input)) return 'platform';
  if (isChurchAdminRole(roles)) return 'church_admin';
  if (isPastorRole(roles)) return 'pastor';
  if (input.isChurchStaff) return 'pastor';
  return 'member';
}

export function persistSessionRoleBucket(bucket: SessionRoleBucket): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ROLE_KEY, bucket);
}

export function readSessionRoleBucket(): SessionRoleBucket | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(ROLE_KEY);
  if (v === 'platform' || v === 'church_admin' || v === 'pastor' || v === 'member') return v;
  return null;
}

export function clearSessionRoleBucket(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ROLE_KEY);
}

/** Prevents marketing home from auto-redirecting to a church after SaaS owner logout. */
export function markSaasMarketingLanding(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SAAS_LANDING_KEY, '1');
}

export function consumeSaasMarketingLanding(): boolean {
  if (typeof window === 'undefined') return false;
  const v = sessionStorage.getItem(SAAS_LANDING_KEY) === '1';
  if (v) sessionStorage.removeItem(SAAS_LANDING_KEY);
  return v;
}

/** Home for unit admins / deputies (Assistant, Secretary). */
export function unitAdminHomePath(
  unitAdminUnitIds: string[] | undefined | null,
  unitDeputyUnitIds?: string[] | undefined | null,
): string {
  const ids = [
    ...(unitAdminUnitIds ?? []).filter(Boolean),
    ...(unitDeputyUnitIds ?? []).filter(Boolean),
  ];
  const unique = [...new Set(ids)];
  if (unique.length === 1) return `/dashboard/service-units/${unique[0]}`;
  if (unique.length > 1) return '/dashboard/service-units';
  return '/dashboard/service-units';
}

/** Home for ordinary members — Establishment workers land on their pipeline, not Lounge. */
export function memberHomePath(opts?: {
  unitAdminUnitIds?: string[];
  unitDeputyUnitIds?: string[];
  canAccessFollowUp?: boolean;
  establishmentMode?: string | null;
  isCellBranchWorkspaceUser?: boolean;
}): string {
  if (opts?.isCellBranchWorkspaceUser) {
    return '/dashboard/ministry-cells';
  }
  if (
    (opts?.unitAdminUnitIds ?? []).length > 0 ||
    (opts?.unitDeputyUnitIds ?? []).length > 0
  ) {
    return unitAdminHomePath(opts?.unitAdminUnitIds, opts?.unitDeputyUnitIds);
  }
  const establishmentMode = (opts?.establishmentMode ?? '').trim();
  if (
    opts?.canAccessFollowUp ||
    (establishmentMode && establishmentMode !== 'none')
  ) {
    return '/dashboard/establishment';
  }
  return '/dashboard/lounge';
}

export function postLoginPath(
  bucket: SessionRoleBucket,
  opts?: {
    unitAdminUnitIds?: string[];
    unitDeputyUnitIds?: string[];
    canAccessFollowUp?: boolean;
    establishmentMode?: string | null;
    isCellBranchWorkspaceUser?: boolean;
  },
): string {
  switch (bucket) {
    case 'platform':
      return '/dashboard/platform';
    case 'church_admin':
    case 'pastor':
      return '/dashboard';
    default:
      return memberHomePath(opts);
  }
}

export function postLogoutPath(
  bucket: SessionRoleBucket,
  _churchSlug: string | null | undefined,
): string {
  switch (bucket) {
    case 'platform':
      return '/';
    case 'church_admin':
    case 'pastor':
    default:
      return '/login';
  }
}
