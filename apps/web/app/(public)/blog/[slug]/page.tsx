import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideDocument } from '@/components/marketing/GuideDocument';
import { loadGuide } from '@/lib/public-guides';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const data = await loadGuide(params.slug);
  if (!data || data.page.kind !== 'POST') return { title: 'Article' };
  const path = `/blog/${data.page.slug}`;
  return {
    title: data.page.seoTitle,
    description: data.page.seoDescription,
    alternates: { canonical: path },
    openGraph: {
      title: data.page.seoTitle,
      description: data.page.seoDescription,
      url: path,
      type: 'article',
      images: [{ url: data.page.coverImagePath, alt: data.page.coverImageAlt }],
    },
  };
}

export default async function BlogArticlePage({ params }: { params: { slug: string } }) {
  const data = await loadGuide(params.slug);
  if (!data || data.page.kind !== 'POST') notFound();
  return <GuideDocument page={data.page} related={data.related} />;
}
