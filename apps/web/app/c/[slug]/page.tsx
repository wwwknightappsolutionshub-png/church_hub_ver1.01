import { notFound } from 'next/navigation';
import { ChurchLandingView } from '@/components/church-landing/ChurchLandingView';
import type { PublicChurchLandingDto } from '@church-hub/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function fetchLanding(slug: string): Promise<PublicChurchLandingDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/churches/${encodeURIComponent(slug)}/landing`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const data = await fetchLanding(params.slug);
  if (!data) return { title: 'Church' };
  const description =
    data.landing.hero.subheadline ?? data.landing.about.body.slice(0, 160);
  return {
    title: `${data.churchName} — Welcome`,
    description,
    openGraph: {
      title: data.churchName,
      description,
      type: 'website',
    },
    alternates: { canonical: `/c/${params.slug}` },
  };
}

export default async function ChurchPublicLandingPage({ params }: { params: { slug: string } }) {
  const data = await fetchLanding(params.slug);
  if (!data) notFound();
  return <ChurchLandingView data={data} />;
}
