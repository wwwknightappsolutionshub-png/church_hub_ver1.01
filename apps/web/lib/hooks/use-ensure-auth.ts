'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  hasAuthToken,
  isLogin2faChallenge,
  isLoginSuccess,
} from '@/lib/auth-login';
import { loginWithDemoCredentials } from '@/lib/auth-login-demo';
import { api, clearAuthTokens } from '@/lib/api';

export { hasAuthToken } from '@/lib/auth-login';

const demoModeEnabled = () => process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

export function useEnsureAuth() {
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authHint, setAuthHint] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const runAuth = useCallback(async () => {
    const runId = ++runIdRef.current;
    const isStale = () => runIdRef.current !== runId;

    setReady(false);
    setAuthHint(null);

    try {
      if (hasAuthToken()) {
        const valid = await verifySession();
        if (isStale()) return;
        if (valid) {
          setAuthenticated(true);
          setReady(true);
          return;
        }
        // Stale token — fall through to demo login or show sign-in
      }

      if (demoModeEnabled()) {
        const result = await loginWithDemoCredentials();
        if (isStale()) return;
        // 2FA challenges also return ok:true — they are NOT a session.
        if (isLoginSuccess(result) && hasAuthToken()) {
          setAuthenticated(true);
          setReady(true);
          return;
        }
        if (isLogin2faChallenge(result)) {
          setAuthHint(
            'Demo admin requires email 2FA. Open Sign in, enter admin@demo.church, then the code from email.',
          );
        } else if (!result.ok) {
          setAuthHint(result.message);
        }
      } else {
        setAuthHint('Demo auto-login is disabled (NEXT_PUBLIC_DEMO_MODE=false).');
      }

      if (isStale()) return;
      setAuthenticated(false);
      setReady(true);
    } catch {
      if (isStale()) return;
      setAuthenticated(false);
      setAuthHint('Could not verify your session. Try signing in again.');
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void runAuth();
  }, [runAuth]);

  return { ready, authenticated, authHint, retry: runAuth };
}

export function logout() {
  clearAuthTokens();
}

export async function verifySession(): Promise<boolean> {
  if (!hasAuthToken()) return false;
  try {
    await api.get('/auth/me', { timeout: 8_000 });
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
      // Transient 429/5xx: keep token so a retry can succeed once API recovers
      return true;
    }
    logout();
    return false;
  }
}
