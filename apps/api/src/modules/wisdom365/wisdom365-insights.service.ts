import { ForbiddenException, Injectable } from '@nestjs/common';
import { Wisdom365SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Wisdom365AccessService } from './wisdom365-access.service';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class Wisdom365InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: Wisdom365AccessService,
  ) {}

  async getChurchInsights(user: AuthUser) {
    const churchId = user.churchId;
    if (!churchId) throw new ForbiddenException('Church context required');

    const gate = await this.access.getChurchGate(churchId);
    if (!gate.moduleEnabled) {
      throw new ForbiddenException('Wisdom365+ is not enabled');
    }

    const [activeSubs, assignments, recentCompletions] = await Promise.all([
      this.prisma.wisdom365Subscription.count({
        where: { churchId, status: Wisdom365SubscriptionStatus.ACTIVE },
      }),
      this.prisma.wisdom365LicenseAssignment.findMany({
        where: {
          isActive: true,
          subscription: { churchId, status: Wisdom365SubscriptionStatus.ACTIVE },
        },
        include: { variant: { select: { slug: true, name: true } } },
      }),
      this.prisma.wisdom365MemberProgress.count({
        where: {
          completedAt: { not: null },
          user: { churchId },
          dateKey: { gte: this.dateDaysAgo(7) },
        },
      }),
    ]);

    const byVariant: Record<string, { name: string; count: number }> = {};
    for (const a of assignments) {
      const key = a.variant.slug;
      if (!byVariant[key]) {
        byVariant[key] = { name: a.variant.name, count: 0 };
      }
      byVariant[key].count += 1;
    }

    const totalLicenses = await this.prisma.wisdom365Subscription.aggregate({
      where: { churchId, status: Wisdom365SubscriptionStatus.ACTIVE },
      _sum: { licenseCount: true },
    });

    return {
      activeSubscriptions: activeSubs,
      totalLicenses: totalLicenses._sum.licenseCount ?? 0,
      assignedJourneys: assignments.length,
      completionsLast7Days: recentCompletions,
      byVariant: Object.entries(byVariant).map(([slug, v]) => ({
        slug,
        name: v.name,
        count: v.count,
      })),
    };
  }

  private dateDaysAgo(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }
}
