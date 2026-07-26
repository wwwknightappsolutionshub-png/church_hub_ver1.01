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
      ok: true;
      requires2fa: true;
      challengeId: string;
      email: string;
      message?: string;
    }
  | {
      ok: false;
      message: string;
      clearPassword?: boolean;
      resetLinkSent?: boolean;
      failedAttempts?: number;
    };

export function isLogin2faChallenge(
  result: LoginResult,
): result is {
  ok: true;
  requires2fa: true;
  challengeId: string;
  email: string;
  message?: string;
} {
  return result.ok === true && 'requires2fa' in result && result.requires2fa === true;
}

export function isLoginSuccess(
  result: LoginResult,
): result is { ok: true; mustChangePassword?: boolean } {
  return result.ok === true && !isLogin2faChallenge(result);
}

type TokenLoginResponse = {
  accessToken: string;
  refreshToken: string;
  mustChangePassword?: boolean;
};

type TwoFaChallengeResponse = {
  requires2fa: true;
  challengeId: string;
  email: string;
  message?: string;
};

function isTwoFaChallenge(data: unknown): data is TwoFaChallengeResponse {
  if (!data || typeof data !== 'object') return false;
  const body = data as Record<string, unknown>;
  return (
    body.requires2fa === true &&
    typeof body.challengeId === 'string' &&
    typeof body.email === 'string'
  );
}

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

async function finishTokenLogin(data: TokenLoginResponse): Promise<LoginResult> {
  setAuthTokens(data.accessToken, data.refreshToken);
  if (data.mustChangePassword) {
    return { ok: true, mustChangePassword: true as const };
  }
  try {
    await applyAuthSessionFromApi();
  } catch {
    /* routing hints optional until /auth/me succeeds */
  }
  return { ok: true };
}

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  try {
    const res = await api.post<TokenLoginResponse | TwoFaChallengeResponse>('/auth/login', {
      email,
      password,
    });
    if (isTwoFaChallenge(res.data)) {
      return {
        ok: true,
        requires2fa: true,
        challengeId: res.data.challengeId,
        email: res.data.email,
        message: res.data.message,
      };
    }
    return finishTokenLogin(res.data);
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

export async function verifyLogin2fa(
  challengeId: string,
  otp: string,
): Promise<LoginResult> {
  try {
    const res = await api.post<TokenLoginResponse>('/auth/login/2fa', {
      challengeId,
      otp,
    });
    return finishTokenLogin(res.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        return {
          ok: false,
          message: 'Cannot reach the API. Please try again shortly.',
        };
      }
      const parsed = parseLoginErrorBody(err.response.data);
      return {
        ok: false,
        message: parsed.message || 'Incorrect verification code',
      };
    }
    return { ok: false, message: 'Verification failed. Please try again.' };
  }
}
