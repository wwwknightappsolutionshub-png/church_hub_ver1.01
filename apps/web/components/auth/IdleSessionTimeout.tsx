'use client';

import { useEffect, useRef } from 'react';
import { clearAuthTokens, api } from '@/lib/api';
import { clearSessionRoleBucket } from '@/lib/session-role';

const IDLE_MS = 300_000; // 5 minutes
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'pointerdown',
];

/**
 * Signs the user out after 300s of no interaction on the dashboard.
 * Redirects to the default login page.
 */
export function IdleSessionTimeout() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const onIdle = async () => {
      const destination = '/login';

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          await api.post('/auth/logout', { refreshToken }, { timeout: 4000 });
        } catch {
          /* Leave the screen anyway; the refresh token is still revoked if the request landed. */
        }
      }
      clearAuthTokens();
      clearSessionRoleBucket();
      window.location.replace(destination);
    };

    const reset = () => {
      clearTimer();
      timerRef.current = setTimeout(onIdle, IDLE_MS);
    };

    reset();
    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, reset, { passive: true });
    }
    document.addEventListener('visibilitychange', reset);

    return () => {
      clearTimer();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, reset);
      }
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);

  return null;
}
