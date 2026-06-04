import axios from 'axios';
import { api, setAuthTokens } from '@/lib/api';
import { applyAuthSessionFromApi } from '@/lib/apply-auth-session';

export function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

export type LoginResult =
  | { ok: true; mustChangePassword?: boolean }
  | { ok: false; message: string };

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const res = await api.post<{
      accessToken: string;
      refreshToken: string;
      mustChangePassword?: boolean;
    }>('/auth/login', { email, password });
    setAuthTokens(res.data.accessToken, res.data.refreshToken);
    if (res.data.mustChangePassword) {
      return { ok: true, mustChangePassword: true as const };
    }
    try {
      await applyAuthSessionFromApi();
    } catch {
      /* routing hints optional until /auth/me succeeds */
    }
    return { ok: true };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return {
          ok: false,
          message:
            'Cannot reach the API on port 4000. Run: pnpm --filter @church-hub/api dev (or pnpm --filter @church-hub/api start after build)',
        };
      }
      const msg = err.response.data?.message;
      if (Array.isArray(msg)) return { ok: false, message: msg.join(', ') };
      if (typeof msg === 'string') return { ok: false, message: msg };
      return { ok: false, message: 'Invalid email or password' };
    }
    return { ok: false, message: 'Sign in failed. Please try again.' };
  }
}
