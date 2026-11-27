import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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

function noteNumber(value: number) {
  return String(value).padStart(2, '0');
}

export default async function BlogIndexPage() {
  const posts = await loadGuideIndex();
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-6 py-14 lg:px-8 lg:py-20">
        <div className="flex items-end justify-between gap-8 border-b border-foreground/15 pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Church_Hub notes</p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight sm:text-5xl">
              Notes for pastors and church teams
            </h1>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Plain writing about membership, first-time guests, discipleship, and the people you meet outside the building.
            </p>
          </div>
          <p className="hidden shrink-0 text-right sm:block">
            <span className="block font-heading text-4xl font-bold leading-none">{noteNumber(posts.length)}</span>
            <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-muted-foreground">notes</span>
          </p>
        </div>

        {featured ? (
          <Link
            href={`/blog/${featured.slug}`}
            className="group mt-10 grid items-center gap-8 lg:grid-cols-12 lg:gap-12"
          >
            <img
              src={safeCoverPath(featured.coverImagePath)}
              alt={featured.coverImageAlt}
              width={1200}
              height={630}
              decoding="async"
              className="aspect-[16/10] w-full rounded-2xl bg-primary object-cover lg:order-2 lg:col-span-5"
            />
            <div className="lg:col-span-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                {noteNumber(1)} · Start here
              </p>
              <h2 className="mt-3 font-heading text-3xl font-bold leading-tight group-hover:text-primary sm:text-4xl">
                {featured.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">{featured.summary}</p>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-foreground">
                Read this note
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        ) : (
          <p className="mt-10 text-muted-foreground">Notes will appear here once they are published.</p>
        )}

        {rest.length > 0 ? (
          <ol className="mt-12 border-t border-foreground/15">
            {rest.map((post, index) => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group grid grid-cols-[2.75rem_1fr_4.75rem] items-center gap-3 border-b border-foreground/10 py-5 sm:grid-cols-[4.5rem_1fr_8rem] sm:gap-8 sm:py-7"
                >
                  <span className="font-heading text-2xl font-bold text-primary/25 sm:text-3xl">
                    {noteNumber(index + 2)}
                  </span>
                  <span className="min-w-0">
                    <h2 className="font-heading text-lg font-semibold leading-snug group-hover:text-primary sm:text-2xl">
                      {post.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{post.summary}</p>
                  </span>
                  <img
                    src={safeCoverPath(post.coverImagePath)}
                    alt=""
                    width={160}
                    height={96}
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-full rounded-lg bg-primary object-cover sm:h-16"
                  />
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </main>
      <MarketingFooter />
      <MarketingTrialModal />
    </div>
  );
}
