'use client';



import Link from 'next/link';

import { ArrowRight, BookOpen, Clock, Megaphone, Sparkles } from 'lucide-react';

import type { PublicChurchLandingDto } from '@church-hub/shared-types';
import { resolveLandingSocialFeed } from '@church-hub/shared-types';

import { Button } from '@/components/ui/button';

import { LandingHeroCarousel } from './LandingHeroCarousel';

import { LandingAboutSection } from './LandingAboutSection';

import { LandingAnnouncementsSection } from './LandingAnnouncementsSection';

import { LandingMembershipSection } from './LandingMembershipSection';
import { LandingSocialFeedSection } from './LandingSocialFeedSection';
import { LandingCommunitySupportSection } from './LandingCommunitySupportSection';

import { LandingSectionHeader } from './LandingSectionHeader';

import {

  churchSectionClass,

  landingCard,

  landingCardFlat,

  landingContainer,

} from './church-landing-classes';

import { cn } from '@/lib/utils';



export function LandingTemplateModern({ data }: { data: PublicChurchLandingDto }) {

  const { landing } = data;

  const loginHref = `/login?church=${encodeURIComponent(data.slug)}`;



  return (

    <>

      <LandingHeroCarousel landing={landing} loginHref={loginHref} variant="modern" />



      {landing.mandate && (

        <section className={churchSectionClass('accent', { rule: true })}>

          <div className={cn(landingContainer, 'max-w-4xl')}>

            <div className={cn(landingCard, 'border-primary/15 bg-card/90 text-center')}>

              <LandingSectionHeader

                title={landing.mandate.title}

                align="center"

                tone="accent"

              />

              <blockquote className="mt-6 text-lg italic leading-relaxed text-muted-foreground sm:mt-8 sm:text-xl">

                &ldquo;{landing.mandate.quote}&rdquo;

              </blockquote>

              {landing.mandate.reference && (

                <p className="mt-4 text-sm font-semibold text-primary">

                  {landing.mandate.reference}

                </p>

              )}

            </div>

          </div>

        </section>

      )}



      <section id="visit" className={churchSectionClass('surface')}>

        <div className={landingContainer}>

          <LandingSectionHeader

            title="Welcome to a Winning World"

            description={`We are delighted to have you with us at ${data.churchName}.`}

            align="center"

            tone="surface"

          />

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

            {landing.quickLinks.map((link, i) => {

              const icons = [Sparkles, Clock, BookOpen, Megaphone];

              const Icon = icons[i % icons.length];

              return (

                <a key={link.id ?? link.title} href={link.href} className={cn(landingCard, 'block')}>

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">

                    <Icon className="h-6 w-6 text-primary" />

                  </div>

                  <h3 className="mt-4 font-heading text-lg font-semibold">{link.title}</h3>

                  {link.description && (

                    <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>

                  )}

                </a>

              );

            })}

          </div>

        </div>

      </section>



      <section id="services" className={churchSectionClass('elevated')}>

        <div className={cn(landingContainer, 'grid gap-8 lg:grid-cols-2 lg:gap-12')}>

          <div>

            <LandingSectionHeader

              eyebrow="Sunday"

              title="Join Us This Sunday"

              description="Fellowship with us in person. Check service times and venues below."

              align="left"

              tone="elevated"

            />

            <Button className="mt-5 h-12 w-full touch-manipulation sm:mt-6 sm:w-auto" asChild>

              <Link href="#contact">

                Plan your visit

                <ArrowRight className="ml-2 h-4 w-4" />

              </Link>

            </Button>

          </div>

          <div className="space-y-3 sm:space-y-4">

            {landing.serviceTimes.map((svc) => (

              <div key={svc.id ?? svc.title} className={landingCardFlat}>

                <p className="font-semibold">{svc.title}</p>

                <p className="text-sm text-muted-foreground">{svc.schedule}</p>

                {svc.note && <p className="mt-1 text-xs text-muted-foreground">{svc.note}</p>}

              </div>

            ))}

          </div>

        </div>

      </section>



      <LandingAnnouncementsSection

        announcements={landing.announcements}

        sectionId="messages"

        tone="accent"

      />



      <LandingAboutSection about={landing.about} showEyebrow={false} tone="surface" />

      <LandingMembershipSection churchSlug={data.slug} churchName={data.churchName} />

      <LandingCommunitySupportSection
        churchSlug={data.slug}
        section={landing.communitySupport}
        items={data.communitySupportItems ?? []}
      />

      {(() => {
        const socialFeed = resolveLandingSocialFeed(landing.socialFeed, data.churchName);
        return socialFeed?.enabled ? (
          <LandingSocialFeedSection feed={socialFeed} churchName={data.churchName} />
        ) : null;
      })()}

    </>

  );

}

