'use client';

import { useEffect } from 'react';

/** Registers the app service worker (public + dashboard) for installable PWA behavior */
export function ChurchPwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        reg.update().catch(() => undefined);
      })
      .catch(() => {
        /* offline shell is best-effort */
      });
  }, []);

  return null;
}
