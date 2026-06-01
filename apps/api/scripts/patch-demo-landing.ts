/**
 * One-time patch: merge sample social feed messages + community support section into demo-church landing JSON.
 * Run: npx ts-node scripts/patch-demo-landing.ts
 */
import { PrismaClient } from '@prisma/client';
import {
  buildDefaultCommunitySupportSection,
  buildDefaultSocialFeed,
  ensureSocialFeedWithSamples,
  normalizeChurchLanding,
} from '@church-hub/shared-types';

const prisma = new PrismaClient();

async function main() {
  const church = await prisma.church.findUnique({ where: { slug: 'demo-church' } });
  if (!church) throw new Error('demo-church not found');

  const settings = (church.settings ?? {}) as Record<string, unknown>;
  const landing = (settings.landing ?? {}) as Record<string, unknown>;
  const churchName = church.name;

  const socialFeed = ensureSocialFeedWithSamples(
    landing.socialFeed as Parameters<typeof ensureSocialFeedWithSamples>[0],
    churchName,
  );
  const merged = normalizeChurchLanding(
    {
      ...(landing as object),
      socialFeed: socialFeed ?? buildDefaultSocialFeed(churchName),
      communitySupport:
        (landing.communitySupport as object | undefined) ?? buildDefaultCommunitySupportSection(),
      published: landing.published !== false,
    } as Parameters<typeof normalizeChurchLanding>[0],
    churchName,
  );

  await prisma.church.update({
    where: { id: church.id },
    data: {
      settings: {
        ...settings,
        landing: merged,
      },
    },
  });

  const approved = await prisma.communitySupportRequest.count({
    where: { churchId: church.id, status: 'APPROVED' },
  });
  console.log('Patched demo-church landing settings.');
  console.log('  socialFeed messages:', merged.socialFeed?.messages.items.length ?? 0);
  console.log('  communitySupport enabled:', merged.communitySupport?.enabled);
  console.log('  approved community requests in DB:', approved);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
