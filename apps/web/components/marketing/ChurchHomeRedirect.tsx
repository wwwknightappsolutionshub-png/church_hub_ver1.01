'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { churchHomePath, getLastChurchSlug } from '@/lib/church-slug';
import { hasAuthToken } from '@/lib/auth-login';
import { consumeSaasMarketingLanding, readSessionRoleBucket } from '@/lib/session-role';

/** Sends returning visitors to their church landing when not signed in (not SaaS owners). */
export function ChurchHomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (hasAuthToken()) return;
    if (consumeSaasMarketingLanding()) return;
    if (readSessionRoleBucket() === 'platform') return;

    const slug = getLastChurchSlug();
    const target = churchHomePath(slug);
    if (target !== '/' && target !== window.location.pathname) {
      router.replace(target);
    }
  }, [router]);

  return null;
}
