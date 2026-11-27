import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, Compass, PhoneCall, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { MarketingTrialModal } from '@/components/marketing/MarketingTrialModal';
import { Button } from '@/components/ui/button';
import { sanitizeGuideHtml } from '@/lib/guide-html';
import { safeCoverPath } from '@/lib/guide-image';
import { getSiteUrl } from '@/lib/site-url';
import type { GuideCard, GuidePage } from '@/lib/public-guides';

const INTRO_LABELS = [
  'The gap on Monday',
  'What Church_Hub is',
  'Who it is for',
  'One workspace, different churches',
];

function sectionId(title: string) {
  const id = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return id || 'section';
}

function sectionIcon(title: string): LucideIcon {
  const value = title.toLowerCase();
  if (value.includes('membership')) return Users;
  if (value.includes('follow')) return PhoneCall;
  if (value.includes('discipleship') || value.includes('evangel')) return Compass;
  if (value.includes('pretend') || value.includes('not')) return ShieldCheck;
  return BookOpen;
}

function splitGuide(html: string) {
  const safe = sanitizeGuideHtml(html);
  const parts = safe.split(/<h2>/i);
  const intro = [...(parts[0] ?? '').matchAll(/<p>([\s\S]*?)<\/p>/gi)].map((match) => match[1]);
  const sections = parts.slice(1).map((part) => {
    const close = part.indexOf('</h2>');
    const title = (close === -1 ? part : part.slice(0, close)).replace(/<[^>]+>/g, '').trim();
    const body = close === -1 ? '' : part.slice(close + 5).trim();
    return { title, id: sectionId(title), body };
  });
  return { intro, sections };
}

export function AboutDocument({ page, related }: { page: GuidePage; related: GuideCard[] }) {
  const site = getSiteUrl();
  const { intro, sections } = splitGuide(page.bodyHtml);
  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    headline: page.title,
    description: page.seoDescription,
    image: `${site}${safeCoverPath(page.coverImagePath)}`,
    mainEntityOfPage: `${site}/about`,
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
      <main className="mx-auto max-w-6xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
              <span aria-hidden> / </span>
              <span>About</span>
            </p>
            <h1 className="mt-3 font-heading text-4xl font-bold leading-tight">{page.title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">{page.summary}</p>
            {sections.length > 0 ? (
              <nav aria-label="On this page" className="mt-6 flex flex-wrap gap-2">
                {sections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/40"
                  >
                    {section.title}
                  </a>
                ))}
                {page.faqs.length > 0 ? (
                  <a
                    href="#questions"
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium hover:border-primary/40"
                  >
                    Questions
                  </a>
                ) : null}
              </nav>
            ) : null}
          </div>
          <img
            src={safeCoverPath(page.coverImagePath)}
            alt={page.coverImageAlt}
            width={1200}
            height={630}
            decoding="async"
            className="aspect-[1200/630] w-full rounded-2xl bg-primary object-cover"
          />
        </div>

        {intro.length > 0 ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {intro.map((paragraph, index) => (
              <section key={INTRO_LABELS[index] ?? `intro-${index}`} className="rounded-2xl border border-border bg-card p-5">
                <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-primary">
                  {INTRO_LABELS[index] ?? 'About'}
                </h2>
                <p
                  className="mt-3 text-sm leading-relaxed text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: paragraph }}
                />
              </section>
            ))}
          </div>
        ) : null}

        {sections.length > 0 ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {sections.map((section) => {
              const Icon = sectionIcon(section.title);
              return (
                <section key={section.id} id={section.id} className="scroll-mt-24 rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="font-heading text-xl font-semibold leading-snug">{section.title}</h2>
                  </div>
                  <div
                    className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground [&_a]:font-medium [&_a]:text-primary [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: section.body }}
                  />
                </section>
              );
            })}
          </div>
        ) : null}

        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-muted/40 px-6 py-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-xl font-semibold">Try it with your own church</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a free trial and put your own names in the workspace.
            </p>
          </div>
          <Button asChild>
            <Link href="/register">
              Start a free trial
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {page.faqs.length > 0 ? (
          <section className="mt-12" aria-labelledby="guide-faq">
            <h2 id="guide-faq" className="font-heading text-2xl font-semibold">
              Questions people ask
            </h2>
            <div id="questions" className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {page.faqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4 [&[open]_svg]:rotate-180">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading font-semibold [&::-webkit-details-marker]:hidden">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform" />
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-12" aria-labelledby="related-reading">
            <h2 id="related-reading" className="font-heading text-2xl font-semibold">
              Keep reading
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="flex gap-4 rounded-xl border border-border bg-card p-3 hover:border-primary/40"
                >
                  <img
                    src={safeCoverPath(item.coverImagePath)}
                    alt={item.coverImageAlt}
                    width={120}
                    height={68}
                    loading="lazy"
                    decoding="async"
                    className="h-16 w-24 shrink-0 rounded-lg bg-primary object-cover"
                  />
                  <span>
                    <span className="font-heading text-sm font-semibold leading-snug">{item.title}</span>
                    <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">{item.summary}</span>
                  </span>
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
