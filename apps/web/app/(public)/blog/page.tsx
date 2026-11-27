import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingTrialModal } from '@/components/marketing/MarketingTrialModal';
import { safeCoverPath } from '@/lib/guide-image';
import { loadGuideIndex } from '@/lib/public-guides';

export const metadata: Metadata = {
  title: 'Blog | Church management, membership, and follow-up',
  description:
    'Notes for pastors and church teams on church management software, membership, first-time guest follow-up, discipleship, and evangelism.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndexPage() {
  const posts = await loadGuideIndex();
  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <h1 className="font-heading text-4xl font-bold">Notes for pastors and church teams</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Plain writing about membership, first-time guests, discipleship, and the people you meet outside the building.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-2xl border border-border p-4 hover:border-primary/40"
            >
              <img
                src={safeCoverPath(post.coverImagePath)}
                alt={post.coverImageAlt}
                width={1200}
                height={630}
                loading="lazy"
                decoding="async"
                className="aspect-[1200/630] w-full rounded-xl bg-primary object-cover"
              />
              <h2 className="mt-4 font-heading text-xl font-semibold leading-snug">{post.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
            </Link>
          ))}
        </div>
      </main>
      <MarketingFooter />
      <MarketingTrialModal />
    </div>
  );
}
