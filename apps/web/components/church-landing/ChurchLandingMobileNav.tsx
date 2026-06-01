'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { landingTouchControl } from './church-landing-classes';
import { cn } from '@/lib/utils';

export type ChurchNavLink = { href: string; label: string };

export function ChurchLandingMobileNav({
  navLinks,
  loginHref,
  churchName,
}: {
  navLinks: ChurchNavLink[];
  loginHref: string;
  churchName: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const close = () => setOpen(false);

  const followAnchor = (href: string) => {
    close();
    if (!href.startsWith('#')) return;
    const id = href.slice(1);
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="flex items-center gap-1 md:hidden">
      <button
        type="button"
        className={cn(landingTouchControl, 'text-foreground')}
        aria-expanded={open}
        aria-controls="church-mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={close}
          />
          <nav
            id="church-mobile-nav"
            className="church-mobile-nav-sheet absolute inset-x-0 bottom-0 flex max-h-[min(85dvh,560px)] flex-col overflow-hidden rounded-t-3xl border-t border-border bg-card shadow-2xl"
            aria-label={`${churchName} navigation`}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="font-heading text-sm font-semibold">Menu</span>
              <button
                type="button"
                className={landingTouchControl}
                onClick={close}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="flex min-h-12 touch-manipulation items-center rounded-xl px-4 text-base font-medium text-foreground active:bg-muted"
                    onClick={(e) => {
                      if (link.href.startsWith('#')) {
                        e.preventDefault();
                        followAnchor(link.href);
                      } else {
                        close();
                      }
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="shrink-0 border-t border-border p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <Button className="h-12 w-full touch-manipulation text-base" asChild>
                <Link href={loginHref} onClick={close}>
                  Member sign in
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
