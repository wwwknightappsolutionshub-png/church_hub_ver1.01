import { api, clearAuthTokens } from '@/lib/api';
import { churchPublicPath, getLastChurchSlug, setLastChurchSlug } from '@/lib/church-slug';
import {
  clearSessionRoleBucket,
  isPlatformRole,
  markSaasMarketingLanding,
  postLogoutPath,
  readSessionRoleBucket,
  resolveSessionRoleBucket,
  type SessionRoleBucket,
} from '@/lib/session-role';

const ME_TIMEOUT_MS = 2500;

type SignOutMe = {
  isPlatformAdmin?: boolean;
  isPlatformOperator?: boolean;
  isChurchStaff?: boolean;
  userRoles?: string[];
  churchSlug?: string | null;
};

function resolveBucket(me: SignOutMe | null): SessionRoleBucket {
  if (me) {
    return resolveSessionRoleBucket({
      userRoles: me.userRoles,
      isPlatformAdmin: me.isPlatformAdmin,
      isPlatformOperator: me.isPlatformOperator,
      isChurchStaff: me.isChurchStaff,
    });
  }
  const cached = readSessionRoleBucket();
  if (cached) return cached;
  return 'member';
}

function resolvePostLogoutPath(me: SignOutMe | null): string {
  const bucket = resolveBucket(me);
  const slug =
    bucket === 'platform'
      ? null
      : me?.churchSlug?.trim() || getLastChurchSlug();

  if (bucket === 'platform') {
    setLastChurchSlug(null);
    markSaasMarketingLanding();
  }

  return postLogoutPath(bucket, slug);
}

export function getChurchHomePath(): string {
  const slug = getLastChurchSlug();
  return slug ? churchPublicPath(slug) : '/';
}

export function getChurchLoginPath(slug?: string | null): string {
  const resolved = slug?.trim() || getLastChurchSlug();
  return resolved ? `/login?church=${encodeURIComponent(resolved)}` : '/login';
}

/**
 * Revoke refresh token (best-effort), clear local session, redirect by role.
 * Clears local tokens promptly so logout is not blocked by slow /auth/me calls.
 */
export async function signOutAndRedirect(): Promise<void> {
  if (typeof window === 'undefined') return;

  const refreshToken = localStorage.getItem('refreshToken');
  if (refreshToken) {
    void api.post('/auth/logout', { refreshToken }).catch(() => {});
  }

  let me: SignOutMe | null = null;
  try {
    const { data } = await api.get<SignOutMe>('/auth/me', { timeout: ME_TIMEOUT_MS });
    me = data;
    if (isPlatformRole(data.userRoles, data)) {
      me = { ...data, isPlatformOperator: true, churchSlug: null };
    }
  } catch {
    /* fall back to cached role bucket */
  }

  const destination = resolvePostLogoutPath(me);
  clearAuthTokens();
  clearSessionRoleBucket();
  window.location.replace(destination);
}

export async function signOutAndGoHome(): Promise<void> {
  return signOutAndRedirect();
}

export { churchPublicPath };
