import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl();
  const lastModified = new Date();
  const paths = ['', '/contact', '/register', '/legal/privacy-policy', '/legal/terms-of-service', '/legal/cookie-policy'];
  return paths.map((path) => ({
    url: `${site}${path}`,
    lastModified,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.6,
  }));
}
