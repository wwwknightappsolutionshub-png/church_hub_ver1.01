'use client';



import { ArrowRight, Calendar, MapPin, Users } from 'lucide-react';

import type { PublicChurchLandingDto } from '@church-hub/shared-types';
import { resolveLandingSocialFeed } from '@church-hub/shared-types';

import { cn } from '@/lib/utils';

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

  landingContainer,

} from './church-landing-classes';



export function LandingTemplateClassic({ data }: { data: PublicChurchLandingDto }) {

  const { landing } = data;

  const loginHref = `/login?church=${encodeURIComponent(data.slug)}`;



  return (

    <>

      <LandingHeroCarousel landing={landing} loginHref={loginHref} variant="classic" />



      <LandingAboutSection about={landing.about} showEyebrow tone="surface" />



      <section id="services" className={churchSectionClass('elevated')}>

        <div className={landingContainer}>

          <LandingSectionHeader

            eyebrow="Join us"

            title="Service Times"

            description="Gather with us each week — all are welcome."

            align="center"

            tone="elevated"

          />

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">

            {landing.serviceTimes.map((svc) => (

              <div key={svc.id ?? svc.title} className={landingCard}>

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">

                  <Calendar className="h-6 w-6 text-primary" />

                </div>

                <h3 className="mt-4 font-heading text-lg font-semibold">{svc.title}</h3>

                <p className="mt-2 font-medium text-foreground">{svc.schedule}</p>

                {svc.note && <p className="mt-1 text-sm text-muted-foreground">{svc.note}</p>}

              </div>

            ))}

          </div>

        </div>

      </section>



      {landing.stats.length > 0 && (

        <section className={churchSectionClass('accent', { rule: true })}>

          <div className={landingContainer}>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">

              {landing.stats.map((stat) => (

                <div

                  key={stat.id ?? stat.label}

                  className="rounded-2xl border border-border/60 bg-card px-4 py-6 text-center shadow-[0_8px_30px_-10px_hsl(222_47%_11%/0.12)] ring-1 ring-black/[0.03] sm:px-6"

                >

                  <p className="font-heading text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">

                    {stat.value}

                  </p>

                  <p className="mt-2 text-sm font-medium text-muted-foreground">{stat.label}</p>

                </div>

              ))}

            </div>

          </div>

        </section>

      )}



      <section id="visit" className={churchSectionClass('surface')}>

        <div className={landingContainer}>

          <LandingSectionHeader

            title="Plan your visit"

            description="Everything you need for your first Sunday with us."

            align="center"

            tone="surface"

          />

          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">

            {landing.quickLinks.map((link) => (

              <a

                key={link.id ?? link.title}

                href={link.href}

                className={cn(landingCard, 'group block')}

              >

                <Users className="h-6 w-6 text-primary" />

                <h3 className="mt-4 font-semibold group-hover:text-primary">{link.title}</h3>

                {link.description && (

                  <p className="mt-2 text-sm text-muted-foreground">{link.description}</p>

                )}

                <ArrowRight className="mt-4 h-4 w-4 text-primary opacity-0 transition group-hover:opacity-100" />

              </a>

            ))}

          </div>

        </div>

      </section>



      <LandingAnnouncementsSection announcements={landing.announcements} tone="elevated" />

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



      <section className={churchSectionClass('inset', { compact: true })}>

        <div

          className={cn(

            landingContainer,

            'flex flex-wrap items-center justify-center gap-2 text-center text-sm text-muted-foreground',

          )}

        >

          <MapPin className="h-4 w-4 shrink-0 text-primary" />

          <span>{landing.contact.address || 'Update address in admin settings'}</span>

        </div>

      </section>

    </>

  );

}

