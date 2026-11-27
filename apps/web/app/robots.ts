import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site-url';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/login', '/forgot-password', '/reset-password', '/api'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  };
}
