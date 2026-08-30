'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (!raw) {
          setNeedsChoice(true);
          setPanelOpen(true);
          return;
        }
        const parsed = JSON.parse(raw) as { choice?: ConsentChoice };
        localStorage.setItem(
          COOKIE_ANALYTICS_FLAG,
          parsed.choice === 'accepted' ? '1' : '0',
        );
        setNeedsChoice(false);
      } catch {
        setNeedsChoice(true);
        setPanelOpen(true);
      }
    };

    syncFromStorage();

    const onReopen = () => {
      setNeedsChoice(true);
      setPanelOpen(true);
    };
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
    setNeedsChoice(false);
    setPanelOpen(false);

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

  return (
    <div
      className="fixed bottom-5 right-5 z-[80] flex flex-col items-end gap-3 supports-[padding:max(0px)]:bottom-[max(1.25rem,env(safe-area-inset-bottom))] supports-[padding:max(0px)]:right-[max(1.25rem,env(safe-area-inset-right))]"
    >
      {panelOpen ? (
        <div
          className="w-[min(calc(100vw-2.5rem),24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          role="dialog"
          aria-label="Cookie preferences"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Cookie className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold">Cookie preferences</p>
                <p className="text-xs text-muted-foreground">Manage your privacy choices</p>
              </div>
            </div>
            {!needsChoice ? (
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setPanelOpen(false)}
                aria-label="Close cookie preferences"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="space-y-4 px-4 py-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              We use essential cookies to run Church Hub and optional cookies to improve the product.
              Read our{' '}
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

            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <p className="text-xs font-medium">Essential cookies</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Required for sign-in, security, and core platform features. Always active.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => void save('essential')}>
                Essential only
              </Button>
              <Button size="sm" className="flex-1 shadow-brand" onClick={() => void save('accepted')}>
                Accept all
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        className={cn(
          'group relative flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-sidebar text-white shadow-elevated transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          needsChoice && 'ring-2 ring-gold/60 ring-offset-2 ring-offset-background',
        )}
        aria-label={panelOpen ? 'Hide cookie preferences' : 'Open cookie preferences'}
        aria-expanded={panelOpen}
      >
        <Cookie className="h-5 w-5 transition-transform group-hover:rotate-12" aria-hidden />
        {needsChoice ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
          </span>
        ) : null}
      </button>
    </div>
  );
}
