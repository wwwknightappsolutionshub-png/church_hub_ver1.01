'use client';

import { useEffect } from 'react';
import { isPublicWebFormPath } from '@/lib/pwa-install';

/** Registers the app service worker (public + dashboard) for installable PWA behavior */
export function ChurchPwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    // Field QR/NFC forms stay browser-only — skip SW so phones don't push "Install app".
    if (isPublicWebFormPath()) return;
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
