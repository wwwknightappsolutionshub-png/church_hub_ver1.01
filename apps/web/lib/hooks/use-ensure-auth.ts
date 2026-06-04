'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { hasAuthToken } from '@/lib/auth-login';
import { loginWithDemoCredentials } from '@/lib/auth-login-demo';
import { api, clearAuthTokens } from '@/lib/api';

export { hasAuthToken } from '@/lib/auth-login';

const demoModeEnabled = () => process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function useEnsureAuth() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authHint, setAuthHint] = useState<string | null>(null);

  const runAuth = useCallback(async () => {
    setReady(false);
    setAuthHint(null);

    if (hasAuthToken()) {
      const valid = await verifySession();
      if (valid) {
        setAuthenticated(true);
        setReady(true);
        return;
      }
      // Stale token — fall through to demo login or show sign-in
    }

    if (demoModeEnabled()) {
      const result = await loginWithDemoCredentials();
      if (result.ok) {
        setAuthenticated(true);
        setReady(true);
        return;
      }
      setAuthHint(result.message);
    } else {
      setAuthHint('Demo auto-login is disabled (NEXT_PUBLIC_DEMO_MODE=false).');
    }

    setAuthenticated(false);
    setReady(true);
  }, []);

  useEffect(() => {
    runAuth();
  }, [runAuth]);

  return { ready, authenticated, authHint, retry: runAuth };
}

export function logout() {
  clearAuthTokens();
}

export async function verifySession(): Promise<boolean> {
  if (!hasAuthToken()) return false;
  try {
    await api.get('/auth/me');
    return true;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        // API unreachable — keep session; login already succeeded
        return true;
      }
      if (err.response.status === 401 || err.response.status === 403) {
        logout();
        return false;
      }
      return true;
    }
    logout();
    return false;
  }
}
