'use client';

import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand/BrandMark';
import { Button } from '@/components/ui/button';
import { reopenCookiePreferences } from '@/lib/cookie-preferences';

const footerLinks = {
  Product: [
    { label: 'Platform', href: '/#platform' },
    { label: 'Modules', href: '/#modules' },
    { label: 'Security', href: '/#security' },
    { label: 'Demo', href: '/dashboard' },
  ],
  Company: [
    { label: 'About', href: '/#why-churches' },
    { label: 'Contact', href: '/register' },
  ],
};

const trustBadges = [
  { icon: ShieldCheck, label: 'SOC 2 ready' },
  { icon: Lock, label: 'Encrypted at rest' },
];

export function MarketingFooter() {
  return (
    <footer className="relative overflow-hidden bg-sidebar text-sidebar-foreground">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <BrandMark variant="light" showTagline />
            <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-foreground/75">
              Enterprise church community management — membership, discipleship, evangelism,
              and every ministry in one secure platform built for multi-campus operations.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {trustBadges.map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sidebar-foreground/90"
                >
                  <Icon className="h-3.5 w-3.5 text-gold" aria-hidden />
                  {label}
                </span>
              ))}
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="mt-8 shadow-lg"
              asChild
            >
              <Link href="/register">
                Start free trial
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-6 lg:justify-items-end">
            {Object.entries(footerLinks).map(([group, links]) => (
              <div key={group} className="lg:min-w-[9rem]">
                <p className="font-heading text-sm font-semibold tracking-wide text-white">{group}</p>
                <ul className="mt-4 space-y-2.5">
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link
                        href={href}
                        className="text-sm text-sidebar-foreground/70 transition-colors hover:text-gold"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:gap-6">
          <p className="shrink-0 font-heading text-sm font-semibold tracking-wide text-white">
            Compliance
          </p>
          <p className="flex-1 text-sm leading-snug text-sidebar-foreground/70">
            Church_Hub is designed for GDPR-aware data handling, role-based access, and audit-ready
            ministry operations.
          </p>
          <Link
            href="/legal/privacy-policy"
            className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-gold hover:underline sm:ml-auto"
          >
            View trust center
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-sidebar-foreground/55">
            © {new Date().getFullYear()} Church_Hub. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-sidebar-foreground/55">
            <Link href="/legal/privacy-policy" className="hover:text-sidebar-foreground">
              Privacy
            </Link>
            <Link href="/legal/terms-of-service" className="hover:text-sidebar-foreground">
              Terms
            </Link>
            <Link href="/legal/cookie-policy" className="hover:text-sidebar-foreground">
              Cookies
            </Link>
            <button
              type="button"
              className="hover:text-sidebar-foreground"
              onClick={reopenCookiePreferences}
            >
              Cookie settings
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
