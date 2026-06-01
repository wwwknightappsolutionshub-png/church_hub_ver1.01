'use client';

import Link from 'next/link';
import type { PublicChurchLandingDto } from '@church-hub/shared-types';
import { resolveLandingSocialFeed } from '@church-hub/shared-types';
import { Button } from '@/components/ui/button';
import { churchPublicPath } from '@/lib/church-slug';
import { churchLandingNavLinks } from './church-landing-nav';
import { ChurchLandingMobileNav } from './ChurchLandingMobileNav';
import { churchSectionClass, landingContainer } from './church-landing-classes';
import { cn } from '@/lib/utils';

export function ChurchLandingShell({
  data,
  children,
}: {
  data: PublicChurchLandingDto;
  children: React.ReactNode;
}) {
  const loginHref = `/login?church=${encodeURIComponent(data.slug)}`;
  const socialFeed = data.landing.socialFeed
    ? resolveLandingSocialFeed(data.landing.socialFeed, data.churchName)
    : undefined;

  const navLinks = churchLandingNavLinks(data.landing.templateId, {
    showCommunitySupport: Boolean(
      data.landing.communitySupport?.enabled !== false &&
        (data.communitySupportItems?.length ?? 0) > 0,
    ),
    showSocialFeed: Boolean(
      socialFeed?.enabled &&
        ((socialFeed.reviews.enabled && socialFeed.reviews.items.length > 0) ||
          (socialFeed.messages.enabled && socialFeed.messages.items.length > 0)),
    ),
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <header className="church-landing-header sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div
          className={cn(
            landingContainer,
            'flex h-14 items-center justify-between gap-2 sm:h-16 sm:gap-4',
          )}
        >
          <Link
            href={churchPublicPath(data.slug)}
            className="flex min-w-0 flex-1 items-center gap-2 touch-manipulation sm:gap-3"
          >
            {data.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.logoUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-lg object-cover sm:h-10 sm:w-10"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 font-heading text-xs font-bold text-primary sm:h-10 sm:w-10 sm:text-sm">
                {data.churchName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="truncate font-heading text-base font-semibold sm:text-lg">
              {data.churchName}
            </span>
          </Link>

          <nav
            className="hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex lg:gap-6"
            aria-label="Primary"
          >
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-10 touch-manipulation sm:inline-flex"
              asChild
            >
              <Link href={loginHref}>Member sign in</Link>
            </Button>
            <ChurchLandingMobileNav
              navLinks={navLinks}
              loginHref={loginHref}
              churchName={data.churchName}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer
        id="contact"
        className={cn(
          churchSectionClass('inset', { compact: true }),
          'pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <div className={cn(landingContainer, 'py-10 sm:py-12')}>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-heading text-lg font-semibold">Contact</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {data.landing.contact.address && <li>{data.landing.contact.address}</li>}
                {data.landing.contact.phone && (
                  <li>
                    <a
                      href={`tel:${data.landing.contact.phone.replace(/\s/g, '')}`}
                      className="touch-manipulation text-primary hover:underline"
                    >
                      {data.landing.contact.phone}
                    </a>
                  </li>
                )}
                {data.landing.contact.email && (
                  <li>
                    <a
                      href={`mailto:${data.landing.contact.email}`}
                      className="touch-manipulation text-primary hover:underline"
                    >
                      {data.landing.contact.email}
                    </a>
                  </li>
                )}
                {(data.city || data.country) && (
                  <li>{[data.city, data.country].filter(Boolean).join(', ')}</li>
                )}
              </ul>
            </div>
            <div className="flex flex-col justify-between gap-4 md:items-end md:text-right">
              <p className="text-sm text-muted-foreground">
                {data.landing.footerTagline ?? `© ${new Date().getFullYear()} ${data.churchName}`}
              </p>
              <Button className="h-12 w-full touch-manipulation sm:w-auto" asChild>
                <Link href={loginHref}>Enter member portal</Link>
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
