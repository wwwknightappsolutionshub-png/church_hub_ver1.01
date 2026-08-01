'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useApiQuery } from '@/lib/hooks/use-api-query';
import { BrandMark } from '@/components/brand/BrandMark';

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur dark:bg-slate-950/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <BrandMark />
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : isError || !data ? (
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold">Page not available</h1>
            <p className="text-muted-foreground">
              This legal page is not published yet. Please check back later.
            </p>
            <Link href="/" className="text-sm font-medium text-primary hover:underline">
              Return home
            </Link>
          </div>
        ) : (
          <article>
            <h1 className="font-display text-3xl font-semibold tracking-tight">{data.title}</h1>
            {data.summary ? (
              <p className="mt-2 text-muted-foreground">{data.summary}</p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Version {data.version}
              {data.publishedAt
                ? ` · Published ${new Date(data.publishedAt).toLocaleDateString()}`
                : null}
            </p>
            <div
              className="prose prose-slate dark:prose-invert mt-8 max-w-none"
              dangerouslySetInnerHTML={{ __html: data.htmlBody }}
            />
          </article>
        )}
      </main>
    </div>
  );
}
