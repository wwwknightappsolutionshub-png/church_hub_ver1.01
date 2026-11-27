import type { Metadata } from 'next';
import { PublicSiteScripts } from '@/components/marketing/PublicSiteScripts';
import { loadPublicSiteTracking } from '@/lib/public-site-tracking';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const tracking = await loadPublicSiteTracking();
  if (!tracking.googleSiteVerification) return {};
  return { verification: { google: tracking.googleSiteVerification } };
}

export default async function PublicMarketingLayout({ children }: { children: React.ReactNode }) {
  const tracking = await loadPublicSiteTracking();
  return (
    <>
      <PublicSiteScripts tracking={tracking} />
      {children}
    </>
  );
}
