import { cache } from 'react';
import { getServerApiBaseUrl } from '@/lib/server-api-url';

export type PublicSiteTracking = {
  gtmContainerId: string | null;
  gaMeasurementId: string | null;
  facebookPixelId: string | null;
  googleSiteVerification: string | null;
};

const EMPTY: PublicSiteTracking = {
  gtmContainerId: null,
  gaMeasurementId: null,
  facebookPixelId: null,
  googleSiteVerification: null,
};

const GTM_RE = /^GTM-[A-Z0-9]{4,20}$/;
const GA_RE = /^G-[A-Z0-9]{4,20}$/;
const PIXEL_RE = /^[0-9]{5,20}$/;
const VERIFICATION_RE = /^[A-Za-z0-9_-]{8,128}$/;

function allow(value: unknown, pattern: RegExp): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || !pattern.test(trimmed)) return null;
  return trimmed;
}

let memory: { at: number; value: PublicSiteTracking } | null = null;
const CACHE_MS = 60_000;

export const loadPublicSiteTracking = cache(async (): Promise<PublicSiteTracking> => {
  if (memory && Date.now() - memory.at < CACHE_MS) return memory.value;
  try {
    const res = await fetch(`${getServerApiBaseUrl()}/api/v1/public/site-tracking`, {
      cache: 'no-store',
    });
    if (!res.ok) return memory?.value ?? EMPTY;
    const data = (await res.json()) as Partial<PublicSiteTracking>;
    const value: PublicSiteTracking = {
      gtmContainerId: allow(data.gtmContainerId, GTM_RE),
      gaMeasurementId: allow(data.gaMeasurementId, GA_RE),
      facebookPixelId: allow(data.facebookPixelId, PIXEL_RE),
      googleSiteVerification: allow(data.googleSiteVerification, VERIFICATION_RE),
    };
    memory = { at: Date.now(), value };
    return value;
  } catch {
    return memory?.value ?? EMPTY;
  }
});
