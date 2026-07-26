import axios from 'axios';
import { api, setAuthTokens } from '@/lib/api';
import { applyAuthSessionFromApi } from '@/lib/apply-auth-session';
import type { LoginResult } from '@/lib/auth-login';

function apiMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return 'Cannot reach the API. Please try again shortly.';
    }
    const msg = err.response.data?.message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

export async function requestPasswordReset(email: string): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return { ok: true, message: res.data.message };
  } catch (err) {
    return { ok: false, message: apiMessage(err, 'Could not send reset email') };
  }
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    const res = await api.post<{ message: string }>('/auth/reset-password', {
      token,
      newPassword,
    });
    return { ok: true, message: res.data.message };
  } catch (err) {
    return { ok: false, message: apiMessage(err, 'Could not reset password') };
  }
}

export async function requestMagicLink(email: string): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  try {
    const res = await api.post<{ message: string }>('/auth/magic-link', { email });
    return { ok: true, message: res.data.message };
  } catch (err) {
    return { ok: false, message: apiMessage(err, 'Could not send sign-in link') };
  }
}

export async function consumeMagicLink(token: string): Promise<LoginResult> {
  try {
    const res = await api.post<{
      accessToken?: string;
      refreshToken?: string;
      mustChangePassword?: boolean;
      requires2fa?: boolean;
      challengeId?: string;
      email?: string;
      message?: string;
    }>('/auth/magic-link/consume', { token });

    if (
      res.data.requires2fa === true &&
      typeof res.data.challengeId === 'string' &&
      typeof res.data.email === 'string'
    ) {
      return {
        ok: true,
        requires2fa: true,
        challengeId: res.data.challengeId,
        email: res.data.email,
        message: res.data.message,
      };
    }

    if (!res.data.accessToken || !res.data.refreshToken) {
      return { ok: false, message: 'Unexpected sign-in response' };
    }

    setAuthTokens(res.data.accessToken, res.data.refreshToken);
    if (res.data.mustChangePassword) {
      return { ok: true, mustChangePassword: true };
    }
    try {
      await applyAuthSessionFromApi();
    } catch {
      /* optional until /auth/me succeeds */
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, message: apiMessage(err, 'This sign-in link is invalid or has expired') };
  }
}
