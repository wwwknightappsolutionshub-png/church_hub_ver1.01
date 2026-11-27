import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AboutDocument } from '@/components/marketing/AboutDocument';
import { loadGuide } from '@/lib/public-guides';

export async function generateMetadata(): Promise<Metadata> {
  const data = await loadGuide('about');
  if (!data || data.page.kind !== 'ABOUT') {
    return { title: 'About Church_Hub' };
  }
  return {
    title: data.page.seoTitle,
    description: data.page.seoDescription,
    alternates: { canonical: '/about' },
    openGraph: {
      title: data.page.seoTitle,
      description: data.page.seoDescription,
      url: '/about',
      images: [{ url: data.page.coverImagePath, alt: data.page.coverImageAlt }],
    },
  };
}

export default async function AboutPage() {
  const data = await loadGuide('about');
  if (!data || data.page.kind !== 'ABOUT') notFound();
  return <AboutDocument page={data.page} related={data.related} />;
}
