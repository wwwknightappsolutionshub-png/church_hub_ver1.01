import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronDown } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingTrialModal } from '@/components/marketing/MarketingTrialModal';
import { Button } from '@/components/ui/button';
import { safeArticleSlug, safeJsonLd, sanitizeGuideHtml } from '@/lib/guide-html';
import { safeCoverPath } from '@/lib/guide-image';
import { getSiteUrl } from '@/lib/site-url';
import type { GuideCard, GuidePage } from '@/lib/public-guides';

function sectionId(title: string) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return id || 'section';
}

function visibleText(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
}

function splitGuide(html: string) {
  const safe = sanitizeGuideHtml(html);
  const parts = safe.split(/<h2>/i);
  const intro = sanitizeGuideHtml((parts[0] ?? '').trim());
  const sections = parts.slice(1).map((part, index) => {
    const close = part.indexOf('</h2>');
    const title = visibleText(close === -1 ? part : part.slice(0, close));
    const body = sanitizeGuideHtml(close === -1 ? '' : part.slice(close + 5).trim());
    return { title, id: `note-${index + 1}-${sectionId(title)}`, body };
  });
  return { intro, sections };
}

const prose =
  'space-y-4 text-base leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_p:first-child]:text-lg [&_p:first-child]:leading-relaxed [&_p:first-child]:text-foreground';

export function GuideDocument({
  page,
  related,
}: {
  page: GuidePage;
  related: GuideCard[];
}) {
  const site = getSiteUrl();
  const slug = safeArticleSlug(page.slug);
  const path = slug ? `/blog/${slug}` : '/blog';
  const title = visibleText(page.title);
  const summary = visibleText(page.summary);
  const { intro, sections } = splitGuide(page.bodyHtml);
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: visibleText(page.seoDescription),
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
      name: visibleText(faq.question),
      acceptedAnswer: { '@type': 'Answer', text: visibleText(faq.answer) },
    })),
  };

  const chapters = (
    <nav aria-label="In this note">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">In this note</p>
      <ol className="mt-4 space-y-3 border-l border-border">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="-ml-px block border-l-2 border-transparent pl-4 text-sm leading-snug text-muted-foreground hover:border-gold hover:text-foreground"
            >
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleLd) }}
      />
      {page.faqs.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(faqLd) }} />
      ) : null}
      <MarketingHeader />
      <article>
        <header className="bg-primary text-primary-foreground">
          <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
            <Link
              href="/blog"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.22em] text-gold hover:text-primary-foreground"
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              All notes
            </Link>
            <h1 className="mt-6 max-w-4xl font-heading text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-primary-foreground/80">{summary}</p>
          </div>
        </header>

        <div className="mx-auto mt-10 max-w-6xl px-6 lg:px-8">
          <img
            src={safeCoverPath(page.coverImagePath)}
            alt={visibleText(page.coverImageAlt)}
            width={1200}
            height={630}
            decoding="async"
            className="aspect-[21/9] w-full rounded-2xl bg-primary object-cover ring-1 ring-black/10"
          />
        </div>

        <div className="mx-auto mt-12 grid max-w-6xl gap-10 px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16 lg:px-8">
          {sections.length > 0 ? <aside className="lg:sticky lg:top-24 lg:self-start">{chapters}</aside> : <div />}

          <div className="min-w-0">
            {intro ? <div className={prose} dangerouslySetInnerHTML={{ __html: sanitizeGuideHtml(intro) }} /> : null}
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24 pt-12">
                <h2 className="border-l-4 border-gold pl-4 font-heading text-2xl font-semibold leading-snug sm:text-3xl">
                  {section.title}
                </h2>
                <div className={`mt-5 ${prose}`} dangerouslySetInnerHTML={{ __html: sanitizeGuideHtml(section.body) }} />
              </section>
            ))}
            {sections.length === 0 && !intro ? (
              <div
                className={`${prose} [&_h2]:mt-12 [&_h2]:border-l-4 [&_h2]:border-gold [&_h2]:pl-4 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground`}
                dangerouslySetInnerHTML={{ __html: sanitizeGuideHtml(page.bodyHtml) }}
              />
            ) : null}

            <div className="mt-14 rounded-2xl bg-primary px-6 py-8 text-primary-foreground sm:px-8">
              <h2 className="font-heading text-2xl font-semibold">Try it with your own church</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
                If this sounds like the week your team is having, start a free trial and put your own names in the workspace.
              </p>
              <Button className="mt-5 bg-gold text-foreground hover:bg-gold/90" asChild>
                <Link href="/register">
                  Start a free trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {page.faqs.length > 0 ? (
          <section className="mx-auto mt-16 max-w-6xl px-6 lg:px-8" aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="font-heading text-3xl font-bold">
              Questions people ask
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group rounded-2xl border border-border bg-card px-5 py-4 [&[open]_svg]:rotate-180">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-heading font-semibold leading-snug [&::-webkit-details-marker]:hidden">
                    {visibleText(faq.question)}
                    <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{visibleText(faq.answer)}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mx-auto mt-16 max-w-6xl px-6 pb-4 lg:px-8" aria-labelledby="related-reading">
            <div className="flex items-end justify-between gap-4">
              <h2 id="related-reading" className="font-heading text-3xl font-bold">
                Keep reading
              </h2>
              <Link href="/blog" className="text-sm font-semibold text-primary hover:underline">
                All notes
              </Link>
            </div>
            <div className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2">
              {related.map((item) => {
                const href = safeArticleSlug(item.slug);
                if (!href) return null;
                return (
                <Link
                  key={href}
                  href={`/blog/${href}`}
                  className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc(25%-12px)]"
                >
                  <img
                    src={safeCoverPath(item.coverImagePath)}
                    alt={visibleText(item.coverImageAlt)}
                    width={640}
                    height={360}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full rounded-2xl bg-primary object-cover"
                  />
                  <h3 className="mt-3 font-heading text-lg font-semibold leading-snug">{visibleText(item.title)}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{visibleText(item.summary)}</p>
                </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </article>
      <MarketingFooter />
      <MarketingTrialModal />
    </div>
  );
}
