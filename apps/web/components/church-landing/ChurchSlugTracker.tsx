'use client';

import { useEffect } from 'react';
import { setLastChurchSlug } from '@/lib/church-slug';

export function ChurchSlugTracker({ slug }: { slug: string }) {
  useEffect(() => {
    setLastChurchSlug(slug);
  }, [slug]);
  return null;
}
