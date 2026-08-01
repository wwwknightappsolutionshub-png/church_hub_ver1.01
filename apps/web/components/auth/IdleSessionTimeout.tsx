'use client';

import { useEffect, useRef } from 'react';
import { clearAuthTokens, api } from '@/lib/api';
import { clearSessionRoleBucket } from '@/lib/session-role';
import { getChurchLoginPath } from '@/lib/sign-out';
import { getLastChurchSlug } from '@/lib/church-slug';

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
 * Redirects to /login?reason=idle (with church slug when known).
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

    const onIdle = () => {
      const slug = getLastChurchSlug();
      const loginPath = getChurchLoginPath(slug);
      const separator = loginPath.includes('?') ? '&' : '?';
      const destination = `${loginPath}${separator}reason=idle`;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        void api.post('/auth/logout', { refreshToken }).catch(() => {});
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
