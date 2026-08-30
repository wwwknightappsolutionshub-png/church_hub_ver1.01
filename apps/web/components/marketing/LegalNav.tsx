'use client';

import Link from 'next/link';
import { FileText, Shield, Cookie, Scale, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LEGAL_PAGES = [
  { slug: 'privacy-policy', label: 'Privacy Policy', icon: Shield },
  { slug: 'terms-of-service', label: 'Terms of Service', icon: Scale },
  { slug: 'cookie-policy', label: 'Cookie Policy', icon: Cookie },
  { slug: 'data-processing-addendum', label: 'Data Processing Addendum', icon: FileText },
] as const;

export function LegalNav({ activeSlug }: { activeSlug: string }) {
  return (
    <nav aria-label="Legal documents" className="space-y-1">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Legal center
      </p>
      {LEGAL_PAGES.map(({ slug, label, icon: Icon }) => {
        const active = slug === activeSlug;
        return (
          <Link
            key={slug}
            href={`/legal/${slug}`}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
      <Link
        href="/"
        className="mt-4 flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ScrollText className="h-4 w-4 shrink-0" aria-hidden />
        Back to homepage
      </Link>
    </nav>
  );
}
