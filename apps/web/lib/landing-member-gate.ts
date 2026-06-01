import axios from 'axios';
import { api } from '@/lib/api';
import { hasAuthToken } from '@/lib/auth-login';
import { verifySession } from '@/lib/hooks/use-ensure-auth';
import { churchPublicPath } from '@/lib/church-slug';

type AuthMeResponse = {
  member?: { id: string } | null;
};

/** True when the visitor has a valid session linked to a church member profile. */
export async function isRegisteredMember(): Promise<boolean> {
  if (!hasAuthToken()) return false;
  const sessionOk = await verifySession();
  if (!sessionOk) return false;
  try {
    const { data } = await api.get<AuthMeResponse>('/auth/me');
    return Boolean(data.member?.id);
  } catch (err) {
    if (axios.isAxiosError(err) && !err.response) return true;
    return false;
  }
}

export function landingMembershipSignupUrl(churchSlug: string): string {
  return `${churchPublicPath(churchSlug)}?register=1#give`;
}

export const KONNECT_JOB_BOARD_PATH = '/dashboard/business?tab=jobs';
