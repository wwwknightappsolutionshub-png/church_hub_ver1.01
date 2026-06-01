import { Injectable, Logger } from '@nestjs/common';
import { Wisdom365SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { PlatformMarketingService } from './platform-marketing.service';

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface UpsellEngagement {
  wisdom365Responded: boolean;
  spirifyResponded: boolean;
  allResponded: boolean;
}

@Injectable()
export class PlatformMarketingDripService {
  private readonly logger = new Logger(PlatformMarketingDripService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketing: PlatformMarketingService,
    private readonly email: EmailAdapter,
  ) {}

  /** Schedule 2h / 3d / 7d upsell drips for a newly registered church admin. */
  async scheduleUpsellSequence(params: {
    churchId: string;
    userId: string;
    registeredAt?: Date;
  }) {
    await this.marketing.ensureSeeded();
    const base = params.registeredAt ?? new Date();
    const steps = [
      { dripStep: 1, delayMs: TWO_HOURS_MS, templateSlug: 'upsell-premium-intro' },
      { dripStep: 2, delayMs: THREE_DAYS_MS, templateSlug: 'upsell-wisdom365-spotlight' },
      { dripStep: 3, delayMs: SEVEN_DAYS_MS, templateSlug: 'upsell-wisdom365-final' },
    ];

    for (const step of steps) {
      try {
        await this.prisma.platformMarketingDrip.upsert({
          where: {
            userId_dripStep: { userId: params.userId, dripStep: step.dripStep },
          },
          create: {
            churchId: params.churchId,
            userId: params.userId,
            dripStep: step.dripStep,
            templateSlug: step.templateSlug,
            scheduledAt: new Date(base.getTime() + step.delayMs),
          },
          update: {},
        });
      } catch (err) {
        this.logger.warn(
          `Could not schedule drip step ${step.dripStep}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  async getUpsellEngagement(churchId: string): Promise<UpsellEngagement> {
    const [activeSubs, sermonCount] = await Promise.all([
      this.prisma.wisdom365Subscription.count({
        where: { churchId, status: Wisdom365SubscriptionStatus.ACTIVE },
      }),
      this.prisma.sermon.count({ where: { churchId } }),
    ]);
    const wisdom365Responded = activeSubs > 0;
    const spirifyResponded = sermonCount > 0;
    return {
      wisdom365Responded,
      spirifyResponded,
      allResponded: wisdom365Responded && spirifyResponded,
    };
  }

  private pickTemplateSlug(
    dripStep: number,
    engagement: UpsellEngagement,
    defaultSlug: string,
  ): string | null {
    if (engagement.allResponded) return null;

    if (dripStep === 1) return 'upsell-premium-intro';

    if (dripStep === 2) {
      if (!engagement.wisdom365Responded) return 'upsell-wisdom365-spotlight';
      if (!engagement.spirifyResponded) return 'upsell-spirify-spotlight';
      return null;
    }

    if (dripStep === 3) {
      if (!engagement.wisdom365Responded) return 'upsell-wisdom365-final';
      if (!engagement.spirifyResponded) return 'upsell-spirify-final';
      return null;
    }

    return defaultSlug;
  }

  async processDueItems() {
    const now = new Date();
    let due: Awaited<ReturnType<typeof this.fetchDueDrips>> = [];
    try {
      due = await this.fetchDueDrips(now);
    } catch (err) {
      this.logger.warn(
        `Drip queue unavailable (run prisma migrate deploy): ${err instanceof Error ? err.message : err}`,
      );
      return;
    }

    for (const row of due) {
      try {
        await this.deliverDrip(row);
      } catch (err) {
        this.logger.warn(
          `Drip ${row.id} failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }

  private fetchDueDrips(now: Date) {
    return this.prisma.platformMarketingDrip.findMany({
      where: {
        scheduledAt: { lte: now },
        sentAt: null,
        skippedAt: null,
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, churchId: true } },
        church: { select: { id: true, name: true, slug: true, settings: true } },
      },
      take: 50,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  private async deliverDrip(row: {
    id: string;
    churchId: string;
    userId: string;
    dripStep: number;
    templateSlug: string;
    user: { email: string; firstName: string; churchId: string | null };
    church: { name: string; slug: string };
  }) {
    const engagement = await this.getUpsellEngagement(row.churchId);
    const slug = this.pickTemplateSlug(row.dripStep, engagement, row.templateSlug);

    if (!slug) {
      await this.prisma.platformMarketingDrip.update({
        where: { id: row.id },
        data: {
          skippedAt: new Date(),
          skipReason: 'User already engaged with Wisdom365+ and Spirify',
        },
      });
      return;
    }

    const rendered = await this.marketing.buildTemplateEmail(slug, {
      churchName: row.church.name,
      churchSlug: row.church.slug,
      roleLabel: 'Church Leader',
      email: row.user.email,
      loginUrl: this.marketing.buildLoginUrl(row.church.slug),
      userFirstName: row.user.firstName,
    });

    await this.email.send({
      churchId: row.churchId,
      to: row.user.email,
      subject: rendered.subject,
      body: rendered.text,
      html: rendered.html,
    });

    await this.prisma.notification.create({
      data: {
        churchId: row.churchId,
        userId: row.userId,
        title: rendered.inAppTitle,
        body: rendered.inAppBody,
        type: 'PLATFORM_UPSELL',
        data: {
          templateSlug: slug,
          dripStep: row.dripStep,
          wisdom365Url: rendered.vars.wisdom365Url,
          spirifyUrl: rendered.vars.spirifyUrl,
        },
      },
    });

    await this.prisma.platformMarketingDrip.update({
      where: { id: row.id },
      data: { sentAt: new Date(), templateSlug: slug },
    });
  }
}
