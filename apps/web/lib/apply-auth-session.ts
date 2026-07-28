import { api } from '@/lib/api';
import { setLastChurchSlug } from '@/lib/church-slug';
import {
  persistSessionRoleBucket,
  postLoginPath,
  resolveSessionRoleBucket,
} from '@/lib/session-role';

export type AuthMeRouting = {
  userRoles?: string[];
  isPlatformAdmin?: boolean;
  isPlatformOperator?: boolean;
  isChurchStaff?: boolean;
  churchSlug?: string | null;
};

/** Call after tokens are stored — sets slug, role bucket, returns dashboard path. */
export async function applyAuthSessionFromApi(): Promise<string> {
  const { data } = await api.get<AuthMeRouting>('/auth/me');
  const bucket = resolveSessionRoleBucket(data);
  persistSessionRoleBucket(bucket);

  if (bucket === 'platform') {
    setLastChurchSlug(null);
  } else if (data.churchSlug) {
    setLastChurchSlug(data.churchSlug);
  }

  return postLoginPath(bucket);
}

export function applyAuthSessionFromMe(me: AuthMeRouting): string {
  const bucket = resolveSessionRoleBucket(me);
  persistSessionRoleBucket(bucket);
  if (bucket === 'platform') {
    setLastChurchSlug(null);
  } else if (me.churchSlug) {
    setLastChurchSlug(me.churchSlug);
  }
  return postLoginPath(bucket);
}
