import { cache } from 'react';
import { getServerApiBaseUrl } from '@/lib/server-api-url';
import { safeCoverPath } from '@/lib/guide-image';

export { safeCoverPath };

export type GuideCard = {
  slug: string;
  title: string;
  summary: string;
  coverImagePath: string;
  coverImageAlt: string;
};

export type GuideFaq = { question: string; answer: string };

export type GuidePage = GuideCard & {
  kind: 'ABOUT' | 'POST';
  seoTitle: string;
  seoDescription: string;
  bodyHtml: string;
  faqs: GuideFaq[];
  publishedAt: string | null;
  updatedAt: string;
};

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${getServerApiBaseUrl()}/api/v1${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const loadHomepageGuides = cache(async () => {
  return (await readJson<GuideCard[]>('/public/guides/home')) ?? [];
});

export const loadGuideIndex = cache(async () => {
  return (await readJson<GuideCard[]>('/public/guides')) ?? [];
});

export const loadGuide = cache(async (slug: string) => {
  return readJson<{ page: GuidePage; related: GuideCard[] }>(`/public/guides/${encodeURIComponent(slug)}`);
});
