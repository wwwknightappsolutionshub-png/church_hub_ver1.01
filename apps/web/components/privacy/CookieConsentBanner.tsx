'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';

export const COOKIE_CONSENT_STORAGE_KEY = 'churchhub_cookie_consent_v1';
export const COOKIE_ANALYTICS_FLAG = 'churchhub_analytics_allowed';

type ConsentChoice = 'accepted' | 'essential';

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(COOKIE_ANALYTICS_FLAG) === '1';
  } catch {
    return false;
  }
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
      if (!raw) setVisible(true);
      else {
        const parsed = JSON.parse(raw) as { choice?: ConsentChoice };
        localStorage.setItem(
          COOKIE_ANALYTICS_FLAG,
          parsed.choice === 'accepted' ? '1' : '0',
        );
      }
    } catch {
      setVisible(true);
    }

    const onReopen = () => setVisible(true);
    window.addEventListener('churchhub:reopen-cookie-consent', onReopen);
    return () => window.removeEventListener('churchhub:reopen-cookie-consent', onReopen);
  }, []);

  const save = async (choice: ConsentChoice) => {
    try {
      localStorage.setItem(
        COOKIE_CONSENT_STORAGE_KEY,
        JSON.stringify({ choice, at: new Date().toISOString() }),
      );
      localStorage.setItem(COOKIE_ANALYTICS_FLAG, choice === 'accepted' ? '1' : '0');
    } catch {
      /* ignore */
    }
    setVisible(false);

    try {
      await api.post('/privacy/cookies', { choice });
    } catch {
      /* best-effort server log */
    }

    if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
      try {
        await api.post('/privacy/consents', {
          consentType: 'COOKIES',
          documentSlug: 'cookie-policy',
          accepted: choice === 'accepted',
        });
      } catch {
        /* ignore */
      }
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-card/95 p-4 shadow-lg backdrop-blur supports-[padding:max(0px)]:pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="dialog"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to run Church Hub and optional cookies to improve the product.
          See our{' '}
          <Link
            href="/legal/cookie-policy"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Cookie Policy
          </Link>{' '}
          and{' '}
          <Link
            href="/legal/privacy-policy"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void save('essential')}>
            Essential only
          </Button>
          <Button size="sm" onClick={() => void save('accepted')}>
            Accept all
          </Button>
        </div>
      </div>
    </div>
  );
}
