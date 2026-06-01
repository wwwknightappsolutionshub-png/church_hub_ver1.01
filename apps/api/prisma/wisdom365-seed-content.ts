import { PrismaClient, Wisdom365ContentStatus } from '@prisma/client';
import {
  WISDOM365_PASSAGE_POOL,
  WISDOM365_VARIANT_CATALOG,
  WISDOM365_THEME_IMAGES,
  buildVariantContent,
} from './wisdom365-content-catalog';

const prisma = new PrismaClient();

export async function seedWisdom365Catalog() {
  console.log('Seeding Wisdom365+ product config…');
  await prisma.wisdom365ProductConfig.upsert({
    where: { id: 'default' },
    create: {
      id: 'default',
      licensePricePence: 1000,
      multiLicenseDiscountPercent: 20,
      multiLicenseMinCount: 2,
      currency: 'GBP',
      subscriptionDurationDays: 365,
      isActive: true,
    },
    update: {
      licensePricePence: 1000,
      multiLicenseDiscountPercent: 20,
      multiLicenseMinCount: 2,
      currency: 'GBP',
      subscriptionDurationDays: 365,
      isActive: true,
    },
  });

  console.log('Seeding Wisdom365+ variants and 365-day content…');
  const now = new Date();

  for (const variantDef of WISDOM365_VARIANT_CATALOG) {
    const variant = await prisma.wisdom365Variant.upsert({
      where: { slug: variantDef.slug },
      create: {
        slug: variantDef.slug,
        name: variantDef.name,
        description: variantDef.description,
        imageUrl: variantDef.imageUrl,
        bibleTranslationLabel: variantDef.bibleTranslationLabel,
        bibleTranslationCode: variantDef.bibleTranslationCode,
        requiresParentalConsent: variantDef.requiresParentalConsent,
        sortOrder: variantDef.sortOrder,
        isActive: true,
      },
      update: {
        name: variantDef.name,
        description: variantDef.description,
        imageUrl: variantDef.imageUrl,
        bibleTranslationLabel: variantDef.bibleTranslationLabel,
        bibleTranslationCode: variantDef.bibleTranslationCode,
        requiresParentalConsent: variantDef.requiresParentalConsent,
        sortOrder: variantDef.sortOrder,
        isActive: true,
      },
    });

    const batch: Array<{
      variantId: string;
      dayOfYear: number;
      title: string;
      reference: string;
      passage: string;
      wisdom: string;
      application: string;
      prayer: string;
      theme: string;
      imageUrl: string;
      audioScriptHint: string;
      status: Wisdom365ContentStatus;
      publishedAt: Date;
    }> = [];

    for (let day = 1; day <= 365; day++) {
      const passage = WISDOM365_PASSAGE_POOL[(day - 1) % WISDOM365_PASSAGE_POOL.length];
      const content = buildVariantContent(variantDef, day, passage);
      const imageUrl = WISDOM365_THEME_IMAGES[passage.theme] ?? variantDef.imageUrl;

      batch.push({
        variantId: variant.id,
        dayOfYear: day,
        title: content.title,
        reference: passage.reference,
        passage: passage.passage,
        wisdom: content.wisdom,
        application: content.application,
        prayer: content.prayer,
        theme: passage.theme,
        imageUrl,
        audioScriptHint: content.audioScriptHint,
        status: Wisdom365ContentStatus.PUBLISHED,
        publishedAt: now,
      });
    }

    await prisma.wisdom365ContentEntry.deleteMany({ where: { variantId: variant.id } });
    const chunkSize = 100;
    for (let i = 0; i < batch.length; i += chunkSize) {
      await prisma.wisdom365ContentEntry.createMany({ data: batch.slice(i, i + chunkSize) });
    }
    console.log(`  ✓ ${variantDef.name}: 365 entries`);
  }

  const churches = await prisma.church.findMany({ select: { id: true } });
  for (const church of churches) {
    await prisma.wisdom365ChurchAvailability.upsert({
      where: { churchId: church.id },
      create: { churchId: church.id, isAvailable: true },
      update: {},
    });
  }
  console.log(`  ✓ Church availability for ${churches.length} churches`);
}

if (require.main === module) {
  seedWisdom365Catalog()
    .then(() => {
      console.log('Wisdom365+ seed complete.');
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
