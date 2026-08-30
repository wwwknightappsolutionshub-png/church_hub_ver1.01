'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, ChevronRight, Loader2, ShieldCheck } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { LegalNav } from '@/components/marketing/LegalNav';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

type LegalPage = {
  slug: string;
  title: string;
  summary: string | null;
  htmlBody: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
};

export default function LegalPageView() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data, isLoading, isError } = useApiQuery<LegalPage>(
    ['legal-page', slug],
    `/content/pages/${slug}`,
    { enabled: !!slug },
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />

      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-border bg-sidebar text-sidebar-foreground">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-faint opacity-20" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-radial-hero opacity-40" />
          <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
            <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-sidebar-foreground/70">
              <Link href="/" className="transition-colors hover:text-white">
                Home
              </Link>
              <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              <span className="text-sidebar-foreground/90">Legal</span>
              {data ? (
                <>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
                  <span className="font-medium text-white">{data.title}</span>
                </>
              ) : null}
            </nav>

            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                <ShieldCheck className="h-6 w-6 text-gold" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading document…
                  </div>
                ) : isError || !data ? (
                  <>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      Page not available
                    </h1>
                    <p className="mt-2 max-w-2xl text-sidebar-foreground/75">
                      This legal page is not published yet. Please check back later or return to the homepage.
                    </p>
                  </>
                ) : (
                  <>
                    <Badge variant="gold" className="mb-3">
                      Trust & compliance
                    </Badge>
                    <h1 className="font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      {data.title}
                    </h1>
                    {data.summary ? (
                      <p className="mt-3 max-w-3xl text-base leading-relaxed text-sidebar-foreground/80">
                        {data.summary}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-sidebar-foreground/65">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                        Version {data.version}
                      </span>
                      {data.publishedAt ? (
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                          Published {new Date(data.publishedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
            <aside className="lg:sticky lg:top-24 lg:self-start">
              <Card className="border-border/80 shadow-sm">
                <CardContent className="p-3">
                  <LegalNav activeSlug={slug} />
                </CardContent>
              </Card>
            </aside>

            <div>
              {isLoading ? (
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="flex items-center gap-2 p-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading document…
                  </CardContent>
                </Card>
              ) : isError || !data ? (
                <Card className="border-border/80 shadow-sm">
                  <CardContent className="space-y-4 p-10">
                    <p className="text-muted-foreground">
                      This legal page is not published yet. Please check back later.
                    </p>
                    <Link href="/" className="inline-flex text-sm font-medium text-primary hover:underline">
                      Return home
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-border/80 shadow-sm">
                  <CardContent className="p-6 sm:p-8 lg:p-10">
                    <article
                      className="legal-prose prose prose-slate max-w-none dark:prose-invert prose-headings:font-heading prose-headings:tracking-tight prose-h2:mt-10 prose-h2:border-b prose-h2:border-border prose-h2:pb-2 prose-a:text-primary prose-a:no-underline hover:prose-a:underline"
                      dangerouslySetInnerHTML={{ __html: data.htmlBody }}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
