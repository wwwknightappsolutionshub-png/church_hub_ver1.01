/**
 * Ensure a church slug exists and its landing is published (fixes public /c/:slug 404).
 * Usage: cd apps/api && npx ts-node scripts/publish-church-landing.ts [slug]
 */
import { PrismaClient } from '@prisma/client';
import {
  createDefaultChurchLanding,
  normalizeChurchLanding,
  type ChurchLandingContent,
} from '@church-hub/shared-types';

const prisma = new PrismaClient();
const slug = process.argv[2] ?? 'demo-church';

async function main() {
  const church = await prisma.church.findUnique({ where: { slug } });
  if (!church) {
    throw new Error(`Church slug "${slug}" not found — create the church in Platform admin or run prisma seed.`);
  }

  const settings = (church.settings ?? {}) as Record<string, unknown>;
  const raw = settings.landing;
  const base: ChurchLandingContent =
    raw && typeof raw === 'object'
      ? normalizeChurchLanding(raw as ChurchLandingContent, church.name)
      : createDefaultChurchLanding(church.name);

  const landing = normalizeChurchLanding({ ...base, published: true }, church.name);

  await prisma.church.update({
    where: { id: church.id },
    data: {
      isActive: true,
      settings: { ...settings, landing },
    },
  });

  console.log(`Published landing for "${slug}" (${church.name}).`);
  console.log(`  public URL path: /c/${slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
