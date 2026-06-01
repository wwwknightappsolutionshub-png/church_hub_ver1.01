import { Injectable, Logger } from '@nestjs/common';
import { Wisdom365SubscriptionStatus } from '@prisma/client';
import {
  CHURCH_TENANT_MODULE_IDS,
  CHURCH_TENANT_MODULE_LABELS,
  parseTenantModulesFromSettings,
} from '@church-hub/shared-types';
import { PrismaService } from '../../prisma/prisma.module';
import { PLATFORM_MARKETING_TEMPLATE_DEFAULTS } from './platform-marketing-defaults';

export const PLATFORM_MARKETING_TEMPLATE_COUNT = PLATFORM_MARKETING_TEMPLATE_DEFAULTS.length;

@Injectable()
export class PlatformAnalyticsService {
  private readonly logger = new Logger(PlatformAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async safe<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (err) {
      this.logger.warn(
        `Analytics partial fallback (${label}): ${err instanceof Error ? err.message : err}`,
      );
      return fallback;
    }
  }

  async getDashboard() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      churchTotal,
      churchActive,
      churchesNew7,
      churchesNew30,
      userTotal,
      memberTotal,
      sermonTotal,
      sermons30,
      churchesWithSermons,
      sermonNoteTotal,
      sermonNotePublished,
      churches,
      w365ActiveSubs,
      w365PendingSubs,
      w365RevenueAgg,
      w365Revenue30Agg,
      w365LicenseAgg,
      w365ChurchesWithSubs,
      w365ChurchesAvailable,
      w365SubsRecent,
    ] = await Promise.all([
      this.safe('church.count', () => this.prisma.church.count(), 0),
      this.safe('church.active', () => this.prisma.church.count({ where: { isActive: true } }), 0),
      this.safe('church.new7', () => this.prisma.church.count({ where: { createdAt: { gte: d7 } } }), 0),
      this.safe('church.new30', () => this.prisma.church.count({ where: { createdAt: { gte: d30 } } }), 0),
      this.safe('users', () => this.prisma.user.count({ where: { churchId: { not: null } } }), 0),
      this.safe('members', () => this.prisma.member.count(), 0),
      this.safe('sermons', () => this.prisma.sermon.count(), 0),
      this.safe('sermons30', () => this.prisma.sermon.count({ where: { createdAt: { gte: d30 } } }), 0),
      this.safe('sermonChurches', () => this.prisma.sermon.groupBy({ by: ['churchId'] }), []),
      this.safe('sermonNotes', () => this.prisma.sermonNote.count(), 0),
      this.safe(
        'sermonNotesPublished',
        () => this.prisma.sermonNote.count({ where: { status: 'PUBLISHED' } }),
        0,
      ),
      this.safe(
        'churches',
        () =>
          this.prisma.church.findMany({
            select: {
              id: true,
              name: true,
              slug: true,
              createdAt: true,
              isActive: true,
              settings: true,
              _count: { select: { members: true, users: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          }),
        [],
      ),
      this.safe(
        'w365.active',
        () =>
          this.prisma.wisdom365Subscription.count({
            where: { status: Wisdom365SubscriptionStatus.ACTIVE },
          }),
        0,
      ),
      this.safe(
        'w365.pending',
        () =>
          this.prisma.wisdom365Subscription.count({
            where: { status: Wisdom365SubscriptionStatus.PENDING },
          }),
        0,
      ),
      this.safe(
        'w365.revenue',
        () =>
          this.prisma.wisdom365Subscription.aggregate({
            where: { status: Wisdom365SubscriptionStatus.ACTIVE },
            _sum: { amountPaidPence: true, licenseCount: true },
          }),
        { _sum: { amountPaidPence: null, licenseCount: null } },
      ),
      this.safe(
        'w365.revenue30',
        () =>
          this.prisma.wisdom365Subscription.aggregate({
            where: {
              status: Wisdom365SubscriptionStatus.ACTIVE,
              createdAt: { gte: d30 },
            },
            _sum: { amountPaidPence: true },
          }),
        { _sum: { amountPaidPence: null } },
      ),
      this.safe('w365.assignments', () => this.prisma.wisdom365LicenseAssignment.count(), 0),
      this.safe(
        'w365.churches',
        () =>
          this.prisma.wisdom365Subscription.groupBy({
            by: ['churchId'],
            where: { status: Wisdom365SubscriptionStatus.ACTIVE },
          }),
        [],
      ),
      this.safe(
        'w365.availability',
        () => this.prisma.wisdom365ChurchAvailability.count({ where: { isAvailable: true } }),
        0,
      ),
      this.safe(
        'w365.recent',
        () =>
          this.prisma.wisdom365Subscription.findMany({
            where: { status: Wisdom365SubscriptionStatus.ACTIVE },
            select: { periodStart: true, createdAt: true, amountPaidPence: true },
            orderBy: { createdAt: 'asc' },
            take: 500,
          }),
        [],
      ),
    ]);

    const marketingStats = await this.safeMarketingStats();
    const moduleAdoption = this.computeModuleAdoption(churches, churchActive || churchTotal || 1);
    const revenueByMonth = this.buildRevenueByMonth(w365SubsRecent);

    const recentTenants = churches.slice(0, 8).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      isActive: c.isActive,
      memberCount: c._count.members,
      userCount: c._count.users,
      createdAt: c.createdAt.toISOString(),
    }));

    const totalRevenuePence = w365RevenueAgg._sum.amountPaidPence ?? 0;
    const activeLicenses = w365RevenueAgg._sum.licenseCount ?? 0;

    return {
      generatedAt: now.toISOString(),
      tenants: {
        total: churchTotal,
        active: churchActive,
        newLast7Days: churchesNew7,
        newLast30Days: churchesNew30,
      },
      users: { total: userTotal },
      members: { total: memberTotal },
      wisdom365: {
        activeSubscriptions: w365ActiveSubs,
        pendingSubscriptions: w365PendingSubs,
        totalLicensesSold: activeLicenses,
        assignedJourneys: w365LicenseAgg,
        totalRevenuePence,
        revenueLast30DaysPence: w365Revenue30Agg._sum.amountPaidPence ?? 0,
        churchesWithActiveSubs: w365ChurchesWithSubs.length,
        churchesAvailable: w365ChurchesAvailable,
      },
      spirify: {
        totalSermons: sermonTotal,
        sermonsLast30Days: sermons30,
        churchesWithSermons: churchesWithSermons.length,
        adoptionPercent:
          churchTotal > 0 ? Math.round((churchesWithSermons.length / churchTotal) * 100) : 0,
      },
      sermonNotes: {
        total: sermonNoteTotal,
        published: sermonNotePublished,
      },
      marketing: marketingStats,
      moduleAdoption,
      revenueByMonth,
      recentTenants,
    };
  }

  private computeModuleAdoption(
    churches: Array<{ settings: unknown }>,
    _activeChurches: number,
  ) {
    const counts = new Map<string, number>();
    for (const id of CHURCH_TENANT_MODULE_IDS) counts.set(id, 0);

    for (const church of churches) {
      const modules = parseTenantModulesFromSettings(church.settings);
      for (const id of CHURCH_TENANT_MODULE_IDS) {
        if (modules[id] !== false) {
          counts.set(id, (counts.get(id) ?? 0) + 1);
        }
      }
    }

    const denom = churches.length || 1;
    return CHURCH_TENANT_MODULE_IDS.map((id) => ({
      module: id,
      label: CHURCH_TENANT_MODULE_LABELS[id],
      churchesEnabled: counts.get(id) ?? 0,
      percent: Math.round(((counts.get(id) ?? 0) / denom) * 100),
    }))
      .filter((m) =>
        ['wisdom365Plus', 'spirify', 'sermonNote', 'communicationsHub', 'devotionalHub'].includes(
          m.module,
        ),
      )
      .sort((a, b) => b.percent - a.percent);
  }

  private buildRevenueByMonth(
    subs: Array<{ periodStart: Date | null; createdAt: Date; amountPaidPence: number | null }>,
  ) {
    const buckets = new Map<string, { revenuePence: number; subscriptions: number }>();
    for (const sub of subs) {
      const at = sub.periodStart ?? sub.createdAt;
      const key = `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}`;
      const cur = buckets.get(key) ?? { revenuePence: 0, subscriptions: 0 };
      cur.revenuePence += sub.amountPaidPence ?? 0;
      cur.subscriptions += 1;
      buckets.set(key, cur);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, ...v }));
  }

  private async safeMarketingStats() {
    return this.safe(
      'marketing',
      async () => {
        const [templateCount, dripsSent, dripsPending, dripsSkipped] = await Promise.all([
          this.prisma.platformEmailTemplate.count(),
          this.prisma.platformMarketingDrip.count({ where: { sentAt: { not: null } } }),
          this.prisma.platformMarketingDrip.count({
            where: { sentAt: null, skippedAt: null, scheduledAt: { gt: new Date() } },
          }),
          this.prisma.platformMarketingDrip.count({ where: { skippedAt: { not: null } } }),
        ]);
        return {
          templateCount,
          expectedTemplateCount: PLATFORM_MARKETING_TEMPLATE_COUNT,
          dripsSent,
          dripsPending,
          dripsSkipped,
        };
      },
      {
        templateCount: 0,
        expectedTemplateCount: PLATFORM_MARKETING_TEMPLATE_COUNT,
        dripsSent: 0,
        dripsPending: 0,
        dripsSkipped: 0,
      },
    );
  }
}
