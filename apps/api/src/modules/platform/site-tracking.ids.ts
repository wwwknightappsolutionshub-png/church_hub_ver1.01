export const DEFAULT_GTM_CONTAINER_ID = 'GTM-WXVNRGZ8';
export const DEFAULT_GA_MEASUREMENT_ID = 'G-LRQXN7591Q';

const GTM_RE = /^GTM-[A-Z0-9]{4,20}$/;
const GA_RE = /^G-[A-Z0-9]{4,20}$/;
const PIXEL_RE = /^[0-9]{5,20}$/;
const VERIFICATION_RE = /^[A-Za-z0-9_-]{8,128}$/;

export type SiteTrackingIds = {
  gtmContainerId: string | null;
  gaMeasurementId: string | null;
  facebookPixelId: string | null;
  googleSiteVerification: string | null;
};

function safeStoredId(value: string | null | undefined, pattern: RegExp): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed || !pattern.test(trimmed)) return null;
  return trimmed;
}

/** Drop anything that is not a strict measurement token before it is rendered or cached. */
export function sanitizeSiteTrackingIds(
  row: Partial<SiteTrackingIds> | null | undefined,
): SiteTrackingIds {
  return {
    gtmContainerId: safeStoredId(row?.gtmContainerId, GTM_RE),
    gaMeasurementId: safeStoredId(row?.gaMeasurementId, GA_RE),
    facebookPixelId: safeStoredId(row?.facebookPixelId, PIXEL_RE),
    googleSiteVerification: safeStoredId(row?.googleSiteVerification, VERIFICATION_RE),
  };
}

export function parseSiteTrackingId(
  value: string | null | undefined,
  pattern: RegExp,
  label: string,
): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/[<>"'`\\]/.test(trimmed) || /script|javascript:/i.test(trimmed)) {
    throw new Error(`${label} must be an ID, not a script`);
  }
  if (!pattern.test(trimmed)) {
    throw new Error(`Invalid ${label}`);
  }
  return trimmed;
}

export function parseSiteTrackingPatch(input: {
  gtmContainerId?: string | null;
  gaMeasurementId?: string | null;
  facebookPixelId?: string | null;
  googleSiteVerification?: string | null;
}): Partial<SiteTrackingIds> {
  const patch: Partial<SiteTrackingIds> = {};
  if (input.gtmContainerId !== undefined) {
    patch.gtmContainerId = parseSiteTrackingId(
      input.gtmContainerId,
      GTM_RE,
      'Google Tag Manager container',
    );
  }
  if (input.gaMeasurementId !== undefined) {
    patch.gaMeasurementId = parseSiteTrackingId(
      input.gaMeasurementId,
      GA_RE,
      'Google Analytics measurement ID',
    );
  }
  if (input.facebookPixelId !== undefined) {
    patch.facebookPixelId = parseSiteTrackingId(
      input.facebookPixelId,
      PIXEL_RE,
      'Facebook Pixel ID',
    );
  }
  if (input.googleSiteVerification !== undefined) {
    patch.googleSiteVerification = parseSiteTrackingId(
      input.googleSiteVerification,
      VERIFICATION_RE,
      'Search Console verification code',
    );
  }
  return patch;
}
