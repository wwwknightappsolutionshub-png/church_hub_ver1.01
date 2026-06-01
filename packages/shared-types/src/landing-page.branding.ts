import { z } from 'zod';

export const LANDING_PUBLIC_DOMAIN_SUFFIX = 'church_hub.org';

/** Default public hostname: `{slug}.church_hub.org` */
export function buildDefaultLandingPublicDomain(slug: string): string {
  const safe = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${safe || 'church'}.${LANDING_PUBLIC_DOMAIN_SUFFIX}`;
}

const HOSTNAME_RE =
  /^[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?(?:\.[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9_])?)+$/;

export function normalizeLandingPublicDomain(
  input: string | null | undefined,
  slug: string,
): string {
  const raw = (input ?? '').trim().toLowerCase();
  if (!raw) return buildDefaultLandingPublicDomain(slug);

  const withoutProtocol = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const host = withoutProtocol.split(':')[0]?.trim() ?? '';
  if (!HOSTNAME_RE.test(host)) {
    throw new Error(
      'Enter a valid domain (letters, numbers, dots, and hyphens only — e.g. gracechurch.org or demo-church.church_hub.org)',
    );
  }
  return host;
}

export const landingBrandingPatchSchema = z.object({
  publicDomain: z.string().max(253).optional().nullable(),
  logoUrl: z.string().max(2048).optional().nullable(),
});

export type LandingBrandingPatch = z.infer<typeof landingBrandingPatchSchema>;

export function landingPublicSiteUrl(publicDomain: string): string {
  return `https://${publicDomain}`;
}

/** True when the value is empty or matches the default `{slug}.church_hub.org`. */
export function isDefaultLandingPublicDomain(
  input: string | null | undefined,
  slug: string,
): boolean {
  const raw = (input ?? '').trim().toLowerCase();
  if (!raw) return true;
  const host = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').split(':')[0]?.trim() ?? '';
  return host === buildDefaultLandingPublicDomain(slug);
}

export function prepareLandingBrandingPatch(
  branding: { publicDomain?: string | null; logoUrl?: string | null },
  slug: string,
): { publicDomain: string | null; logoUrl?: string | null } {
  const domainInput = branding.publicDomain?.trim() ?? '';
  return {
    publicDomain: isDefaultLandingPublicDomain(domainInput, slug) ? null : domainInput,
    logoUrl: branding.logoUrl,
  };
}
