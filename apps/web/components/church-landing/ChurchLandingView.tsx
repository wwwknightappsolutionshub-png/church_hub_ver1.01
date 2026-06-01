'use client';

import type { PublicChurchLandingDto } from '@church-hub/shared-types';
import { ChurchLandingShell } from './ChurchLandingShell';
import { LandingTemplateClassic } from './LandingTemplateClassic';
import { LandingTemplateModern } from './LandingTemplateModern';
import { ChurchSlugTracker } from './ChurchSlugTracker';

export function ChurchLandingView({ data }: { data: PublicChurchLandingDto }) {
  const Template =
    data.landing.templateId === 'modern' ? LandingTemplateModern : LandingTemplateClassic;

  return (
    <>
      <ChurchSlugTracker slug={data.slug} />
      <ChurchLandingShell data={data}>
        <Template data={data} />
      </ChurchLandingShell>
    </>
  );
}
