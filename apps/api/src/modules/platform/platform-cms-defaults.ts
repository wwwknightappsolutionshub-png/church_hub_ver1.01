import {
  PlatformCmsPageKind,
  PlatformCmsPageStatus,
} from '@prisma/client';
import {
  COOKIE_POLICY_HTML,
  DATA_PROCESSING_ADDENDUM_HTML,
  PRIVACY_POLICY_HTML,
  TERMS_OF_SERVICE_HTML,
} from './platform-cms-legal-bodies';

/** Bump when default legal HTML changes — seed sync applies updates to unpublished system drafts. */
export const DEFAULT_CMS_CONTENT_REVISION = 2;

export type DefaultCmsPage = {
  slug: string;
  title: string;
  summary: string;
  kind: PlatformCmsPageKind;
  htmlBody: string;
  contentRevision: number;
};

export const DEFAULT_CMS_PAGES: DefaultCmsPage[] = [
  {
    slug: 'privacy-policy',
    title: 'Privacy Policy',
    summary: 'How Church Hub collects, uses, and protects personal data across all ministry modules.',
    kind: PlatformCmsPageKind.PRIVACY,
    htmlBody: PRIVACY_POLICY_HTML,
    contentRevision: DEFAULT_CMS_CONTENT_REVISION,
  },
  {
    slug: 'terms-of-service',
    title: 'Terms of Use',
    summary: 'Terms governing use of the Church Hub multi-tenant church platform and PWA.',
    kind: PlatformCmsPageKind.TERMS,
    htmlBody: TERMS_OF_SERVICE_HTML,
    contentRevision: DEFAULT_CMS_CONTENT_REVISION,
  },
  {
    slug: 'cookie-policy',
    title: 'Cookie Policy',
    summary: 'Cookies, local storage, and similar technologies used by Church Hub.',
    kind: PlatformCmsPageKind.COOKIE,
    htmlBody: COOKIE_POLICY_HTML,
    contentRevision: DEFAULT_CMS_CONTENT_REVISION,
  },
  {
    slug: 'data-processing-addendum',
    title: 'Data Processing Addendum',
    summary: 'Processor terms for church tenant personal data processed in Church Hub.',
    kind: PlatformCmsPageKind.DPA,
    htmlBody: DATA_PROCESSING_ADDENDUM_HTML,
    contentRevision: DEFAULT_CMS_CONTENT_REVISION,
  },
];

/** Stored in summary for system pages to track bundled default revision (hidden from public listings). */
export const CMS_REVISION_SUMMARY_PREFIX = 'cms-revision:';

export function buildCmsSummary(summary: string, revision: number): string {
  return `${CMS_REVISION_SUMMARY_PREFIX}${revision}|${summary}`;
}

export function parseCmsRevision(summary: string | null | undefined): number | null {
  if (!summary?.startsWith(CMS_REVISION_SUMMARY_PREFIX)) return null;
  const rest = summary.slice(CMS_REVISION_SUMMARY_PREFIX.length);
  const pipe = rest.indexOf('|');
  if (pipe < 0) return null;
  const n = Number.parseInt(rest.slice(0, pipe), 10);
  return Number.isFinite(n) ? n : null;
}

export function parseCmsPublicSummary(summary: string | null | undefined): string | null {
  if (!summary) return null;
  if (!summary.startsWith(CMS_REVISION_SUMMARY_PREFIX)) return summary;
  const pipe = summary.indexOf('|');
  return pipe >= 0 ? summary.slice(pipe + 1) : summary;
}

export const CMS_STATUS = PlatformCmsPageStatus;
export const CMS_KIND = PlatformCmsPageKind;
