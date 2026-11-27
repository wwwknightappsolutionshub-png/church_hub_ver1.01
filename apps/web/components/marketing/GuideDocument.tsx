import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingTrialModal } from '@/components/marketing/MarketingTrialModal';
import { Button } from '@/components/ui/button';
import { sanitizeGuideHtml } from '@/lib/guide-html';
import { safeCoverPath } from '@/lib/guide-image';
import { getSiteUrl } from '@/lib/site-url';
import type { GuideCard, GuidePage } from '@/lib/public-guides';

export function GuideDocument({
  page,
  related,
}: {
  page: GuidePage;
  related: GuideCard[];
}) {
  const site = getSiteUrl();
  const path = page.kind === 'ABOUT' ? '/about' : `/blog/${page.slug}`;
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': page.kind === 'ABOUT' ? 'AboutPage' : 'BlogPosting',
    headline: page.title,
    description: page.seoDescription,
    image: `${site}${safeCoverPath(page.coverImagePath)}`,
    mainEntityOfPage: `${site}${path}`,
    author: { '@type': 'Organization', name: 'Church_Hub' },
    publisher: { '@type': 'Organization', name: 'Church_Hub' },
  };
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd).replace(/</g, '\\u003c') }}
      />
      {page.faqs.length > 0 ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, '\\u003c') }}
        />
      ) : null}
      <MarketingHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span aria-hidden> / </span>
          {page.kind === 'POST' ? (
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
          ) : (
            <span>About</span>
          )}
        </p>
        <h1 className="mt-4 font-heading text-4xl font-bold leading-tight">{page.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{page.summary}</p>
        <img
          src={safeCoverPath(page.coverImagePath)}
          alt={page.coverImageAlt}
          width={1200}
          height={630}
          decoding="async"
          className="mt-8 aspect-[1200/630] w-full rounded-2xl bg-primary object-cover"
        />
        <article
          className="mt-10 space-y-4 text-base leading-relaxed text-foreground [&_h2]:mt-10 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_p]:text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeGuideHtml(page.bodyHtml) }}
        />
        <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-6">
          <h2 className="font-heading text-2xl font-semibold">Try it with your own church</h2>
          <p className="mt-3 text-muted-foreground">
            If this sounds like the week your team is having, start a free trial and put your own names in the workspace.
          </p>
          <Button className="mt-5" asChild>
            <Link href="/register">
              Start a free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {page.faqs.length > 0 ? (
          <section className="mt-12" aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="font-heading text-2xl font-semibold">Questions people ask</h2>
            <div className="mt-6 space-y-6">
              {page.faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className="font-heading text-lg font-semibold">{faq.question}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {related.length > 0 ? (
          <section className="mt-12" aria-labelledby="related-reading">
            <h2 id="related-reading" className="font-heading text-2xl font-semibold">Keep reading</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="rounded-xl border border-border p-4 hover:border-primary/40"
                >
                  <img
                    src={safeCoverPath(item.coverImagePath)}
                    alt={item.coverImageAlt}
                    width={1200}
                    height={630}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[1200/630] w-full rounded-lg bg-primary object-cover"
                  />
                  <h3 className="mt-3 font-heading font-semibold leading-snug">{item.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <MarketingFooter />
      <MarketingTrialModal />
    </div>
  );
}
