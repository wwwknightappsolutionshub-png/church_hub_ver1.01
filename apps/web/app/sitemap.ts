import type { MetadataRoute } from 'next';
import { getServerApiBaseUrl } from '@/lib/server-api-url';
import { getSiteUrl } from '@/lib/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const lastModified = new Date();
  const paths = [
    '',
    '/about',
    '/blog',
    '/contact',
    '/register',
    '/legal/privacy-policy',
    '/legal/terms-of-service',
    '/legal/cookie-policy',
  ];
  const entries: MetadataRoute.Sitemap = paths.map((path) => ({
    url: `${site}${path}`,
    lastModified,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : path === '/about' || path === '/blog' ? 0.8 : 0.6,
  }));
  try {
    const res = await fetch(`${getServerApiBaseUrl()}/api/v1/public/guides/paths`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const rows = (await res.json()) as { path: string; updatedAt: string }[];
      for (const row of rows) {
        if (!row.path?.startsWith('/blog/')) continue;
        entries.push({
          url: `${site}${row.path}`,
          lastModified: row.updatedAt,
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch {
    return entries;
  }
  return entries;
}
