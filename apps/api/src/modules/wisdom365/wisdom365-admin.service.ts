import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Wisdom365ContentStatus,
  Wisdom365SubscriptionStatus,
  Wisdom365VariantSlug,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class Wisdom365AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const [
      variantCount,
      contentCount,
      activeSubs,
      pendingSubs,
      totalRevenue,
      churchesAvailable,
    ] = await Promise.all([
      this.prisma.wisdom365Variant.count(),
      this.prisma.wisdom365ContentEntry.count(),
      this.prisma.wisdom365Subscription.count({
        where: { status: Wisdom365SubscriptionStatus.ACTIVE },
      }),
      this.prisma.wisdom365Subscription.count({
        where: { status: Wisdom365SubscriptionStatus.PENDING },
      }),
      this.prisma.wisdom365Subscription.aggregate({
        where: { status: Wisdom365SubscriptionStatus.ACTIVE },
        _sum: { amountPaidPence: true },
      }),
      this.prisma.wisdom365ChurchAvailability.count({ where: { isAvailable: true } }),
    ]);

    return {
      variantCount,
      contentCount,
      activeSubscriptions: activeSubs,
      pendingSubscriptions: pendingSubs,
      totalRevenuePence: totalRevenue._sum.amountPaidPence ?? 0,
      churchesAvailable,
    };
  }

  async getProductConfig() {
    return this.prisma.wisdom365ProductConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  async updateProductConfig(data: {
    licensePricePence?: number;
    multiLicenseDiscountPercent?: number;
    multiLicenseMinCount?: number;
    currency?: string;
    subscriptionDurationDays?: number;
    stripePriceId?: string | null;
    isActive?: boolean;
  }) {
    return this.prisma.wisdom365ProductConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...data },
      update: data,
    });
  }

  async listVariants() {
    return this.prisma.wisdom365Variant.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async upsertVariant(data: {
    slug: Wisdom365VariantSlug;
    name: string;
    description: string;
    imageUrl: string;
    bibleTranslationLabel: string;
    bibleTranslationCode?: string;
    requiresParentalConsent?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.wisdom365Variant.upsert({
      where: { slug: data.slug },
      create: data,
      update: data,
    });
  }

  async listContent(variantId: string, page = 1, limit = 50, status?: Wisdom365ContentStatus) {
    const where = {
      variantId,
      ...(status ? { status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.wisdom365ContentEntry.findMany({
        where,
        orderBy: { dayOfYear: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.wisdom365ContentEntry.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async getContentEntry(id: string) {
    const entry = await this.prisma.wisdom365ContentEntry.findUnique({
      where: { id },
      include: { variant: true },
    });
    if (!entry) throw new NotFoundException('Content entry not found');
    return entry;
  }

  async createContentEntry(data: {
    variantId: string;
    dayOfYear: number;
    title: string;
    reference: string;
    passage: string;
    wisdom: string;
    application: string;
    prayer: string;
    theme: string;
    imageUrl?: string;
    audioScriptHint?: string;
    status?: Wisdom365ContentStatus;
  }) {
    return this.prisma.wisdom365ContentEntry.create({
      data: {
        ...data,
        publishedAt: data.status === Wisdom365ContentStatus.PUBLISHED ? new Date() : null,
      },
    });
  }

  async updateContentEntry(
    id: string,
    data: Partial<{
      title: string;
      reference: string;
      passage: string;
      wisdom: string;
      application: string;
      prayer: string;
      theme: string;
      imageUrl: string | null;
      audioScriptHint: string | null;
      status: Wisdom365ContentStatus;
      dayOfYear: number;
    }>,
  ) {
    const publishedAt =
      data.status === Wisdom365ContentStatus.PUBLISHED ? new Date() : undefined;
    return this.prisma.wisdom365ContentEntry.update({
      where: { id },
      data: { ...data, ...(publishedAt ? { publishedAt } : {}) },
    });
  }

  async deleteContentEntry(id: string) {
    return this.prisma.wisdom365ContentEntry.delete({ where: { id } });
  }

  async publishContentBatch(variantId: string, dayFrom: number, dayTo: number) {
    return this.prisma.wisdom365ContentEntry.updateMany({
      where: { variantId, dayOfYear: { gte: dayFrom, lte: dayTo } },
      data: { status: Wisdom365ContentStatus.PUBLISHED, publishedAt: new Date() },
    });
  }

  async listChurchAvailability() {
    const churches = await this.prisma.church.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        wisdom365ChurchAvailability: true,
      },
      orderBy: { name: 'asc' },
    });
    return churches.map((c) => ({
      churchId: c.id,
      name: c.name,
      slug: c.slug,
      isAvailable: c.wisdom365ChurchAvailability?.isAvailable ?? true,
      notes: c.wisdom365ChurchAvailability?.notes ?? null,
    }));
  }

  async setChurchAvailability(churchId: string, isAvailable: boolean, notes?: string) {
    return this.prisma.wisdom365ChurchAvailability.upsert({
      where: { churchId },
      create: { churchId, isAvailable, notes },
      update: { isAvailable, notes },
    });
  }

  async listSubscriptions(page = 1, limit = 50, status?: Wisdom365SubscriptionStatus) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.wisdom365Subscription.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          church: { select: { id: true, name: true } },
          assignments: { include: { variant: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.wisdom365Subscription.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async updateSubscriptionStatus(id: string, status: Wisdom365SubscriptionStatus) {
    return this.prisma.wisdom365Subscription.update({
      where: { id },
      data: { status },
    });
  }
}
