import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChurchLandingView } from '@/components/church-landing/ChurchLandingView';
import { getServerApiBaseUrl } from '@/lib/server-api-url';
import { getSiteUrl } from '@/lib/site-url';
import type { PublicChurchLandingDto } from '@church-hub/shared-types';

/** Always read latest landing JSON from the API (no static/ISR cache). */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function fetchLanding(slug: string): Promise<PublicChurchLandingDto | null> {
  try {
    const res = await fetch(
      `${getServerApiBaseUrl()}/api/v1/churches/${encodeURIComponent(slug)}/landing`,
      {
        cache: 'no-store',
        next: { revalidate: 0 },
      },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await fetchLanding(params.slug);
  if (!data) return { title: 'Church' };

  const description =
    data.landing.hero.subheadline ?? data.landing.about.body.slice(0, 160);
  const title = `${data.churchName} — Welcome`;
  const canonical = `/c/${params.slug}`;
  const siteUrl = getSiteUrl();
  const ogImage = `${siteUrl}/images/og-image.png`;
  const ogImageAlt = `${siteUrl}/opengraph-image`;

  return {
    title,
    description,
    openGraph: {
      title: data.churchName,
      description,
      type: 'website',
      url: `${siteUrl}${canonical}`,
      siteName: data.churchName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${data.churchName} — powered by Church_Hub`,
          type: 'image/png',
        },
        {
          url: ogImageAlt,
          width: 1200,
          height: 630,
          alt: `${data.churchName} — powered by Church_Hub`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: data.churchName,
      description,
      images: [ogImage, ogImageAlt],
    },
    alternates: { canonical },
  };
}

export default async function ChurchPublicLandingPage({ params }: { params: { slug: string } }) {
  const data = await fetchLanding(params.slug);
  if (!data) notFound();
  return <ChurchLandingView data={data} />;
}
