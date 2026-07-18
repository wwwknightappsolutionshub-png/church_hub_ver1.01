import axios from 'axios';
import { api, setAuthTokens } from '@/lib/api';
import { applyAuthSessionFromApi } from '@/lib/apply-auth-session';

export function hasAuthToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

export type LoginResult =
  | { ok: true; mustChangePassword?: boolean }
  | {
      ok: false;
      message: string;
      clearPassword?: boolean;
      resetLinkSent?: boolean;
      failedAttempts?: number;
    };

function parseLoginErrorBody(data: unknown): {
  message: string;
  clearPassword?: boolean;
  resetLinkSent?: boolean;
  failedAttempts?: number;
} {
  if (!data || typeof data !== 'object') {
    return { message: 'Invalid email or password' };
  }
  const body = data as Record<string, unknown>;
  const nested =
    body.message && typeof body.message === 'object'
      ? (body.message as Record<string, unknown>)
      : null;

  const messageRaw = nested?.message ?? body.message;
  let message = 'Invalid email or password';
  if (typeof messageRaw === 'string') message = messageRaw;
  else if (Array.isArray(messageRaw)) message = messageRaw.join(', ');

  const clearPassword = Boolean(nested?.clearPassword ?? body.clearPassword);
  const resetLinkSent = Boolean(nested?.resetLinkSent ?? body.resetLinkSent);
  const failedAttemptsRaw = nested?.failedAttempts ?? body.failedAttempts;
  const failedAttempts =
    typeof failedAttemptsRaw === 'number' ? failedAttemptsRaw : undefined;

  return { message, clearPassword, resetLinkSent, failedAttempts };
}

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
      const parsed = parseLoginErrorBody(err.response.data);
      return { ok: false, ...parsed };
    }
    return { ok: false, message: 'Sign in failed. Please try again.' };
  }
}
