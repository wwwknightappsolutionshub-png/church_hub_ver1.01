import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Wisdom365SubscriptionStatus,
  Wisdom365VariantSlug,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Wisdom365AccessService } from './wisdom365-access.service';
import { Wisdom365StripeService } from './wisdom365-stripe.service';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import type { AuthUser } from '../auth/current-user.decorator';

@Injectable()
export class Wisdom365SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: Wisdom365AccessService,
    private readonly stripe: Wisdom365StripeService,
    private readonly email: EmailAdapter,
  ) {}

  private mapSubscriptionSummary(sub: {
    id: string;
    licenseCount: number;
    status: Wisdom365SubscriptionStatus;
    periodStart: Date | null;
    periodEnd: Date | null;
    amountPaidPence: number | null;
    currency: string;
  }) {
    const now = Date.now();
    const periodEndMs = sub.periodEnd?.getTime() ?? 0;
    const daysRemaining =
      sub.periodEnd != null
        ? Math.max(0, Math.ceil((periodEndMs - now) / (1000 * 60 * 60 * 24)))
        : 0;
    return {
      id: sub.id,
      licenseCount: sub.licenseCount,
      status: sub.status,
      periodStart: sub.periodStart?.toISOString() ?? null,
      periodEnd: sub.periodEnd?.toISOString() ?? null,
      amountPaidPence: sub.amountPaidPence,
      currency: sub.currency,
      daysRemaining,
      needsRenewal: daysRemaining > 0 && daysRemaining <= 30,
      isExpired: sub.periodEnd != null && periodEndMs < now,
    };
  }

  async getMe(user: AuthUser) {
    const churchId = user.churchId;
    if (!churchId) {
      return {
        churchModuleEnabled: false,
        churchAvailable: false,
        activeLicenses: 0,
        assignedCount: 0,
        unassignedLicenses: 0,
        unassignedSubscriptionId: null,
        entitlements: [],
        pendingSubscriptionId: null,
        subscriptions: [],
      };
    }

    const gate = await this.access.getChurchGate(churchId);
    const subs = await this.prisma.wisdom365Subscription.findMany({
      where: { userId: user.userId, status: Wisdom365SubscriptionStatus.ACTIVE },
      include: {
        assignments: {
          where: { isActive: true },
          include: { variant: true },
        },
      },
      orderBy: { periodEnd: 'asc' },
    });

    const pending = await this.prisma.wisdom365Subscription.findFirst({
      where: { userId: user.userId, status: Wisdom365SubscriptionStatus.PENDING },
      orderBy: { createdAt: 'desc' },
    });

    const activeWithSlots = subs.find((s) => s.licenseCount > s.assignments.length);

    const activeLicenses = subs.reduce((sum, s) => sum + s.licenseCount, 0);
    const assignments = subs.flatMap((s) => s.assignments);
    const entitlements = assignments.map((a) => ({
      variant: a.variant,
      assignmentId: a.id,
      subscriptionId: a.subscriptionId,
      isKidsManaged: a.variant.slug === Wisdom365VariantSlug.KIDS,
    }));

    const subscriptions = subs.map((s) => this.mapSubscriptionSummary(s));
    const renewalDue = subscriptions.some((s) => s.needsRenewal || s.isExpired);

    return {
      churchModuleEnabled: gate.moduleEnabled,
      churchAvailable: gate.churchAvailable,
      activeLicenses,
      assignedCount: assignments.length,
      unassignedLicenses: Math.max(0, activeLicenses - assignments.length),
      unassignedSubscriptionId: activeWithSlots?.id ?? pending?.id ?? null,
      entitlements,
      pendingSubscriptionId: pending?.id ?? null,
      subscriptions,
      renewalDue,
    };
  }

  async createCheckout(user: AuthUser, licenseCount: number, webBaseUrl: string) {
    await this.access.assertCanAccessWisdom365(user);
    if (licenseCount < 1 || licenseCount > 6) {
      throw new BadRequestException('License count must be between 1 and 6');
    }

    const quote = await this.stripe.calculateTotal(licenseCount);
    const config = await this.prisma.wisdom365ProductConfig.findUnique({
      where: { id: 'default' },
    });
    if (!config?.isActive && this.stripe.isConfigured()) {
      throw new BadRequestException('Wisdom365+ subscriptions are temporarily unavailable');
    }

    const pending = await this.prisma.wisdom365Subscription.create({
      data: {
        userId: user.userId,
        churchId: user.churchId!,
        licenseCount,
        status: Wisdom365SubscriptionStatus.PENDING,
        amountPaidPence: quote.totalPence,
        currency: quote.currency,
      },
    });

    const successUrl = `${webBaseUrl}/dashboard/wisdom365/assign?session={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${webBaseUrl}/dashboard/wisdom365?checkout=cancelled`;

    const checkout = await this.stripe.createCheckoutSession({
      userId: user.userId,
      churchId: user.churchId!,
      email: user.email,
      licenseCount,
      subscriptionId: pending.id,
      successUrl,
      cancelUrl,
    });

    if (checkout.mode === 'stripe' && checkout.sessionId) {
      await this.prisma.wisdom365Subscription.update({
        where: { id: pending.id },
        data: { stripeCheckoutSessionId: checkout.sessionId },
      });
    }

    return {
      subscriptionId: pending.id,
      quote: checkout.quote,
      checkoutUrl: checkout.url,
      devMode: checkout.mode === 'dev',
    };
  }

  async completeDevCheckout(user: AuthUser, subscriptionId: string) {
    await this.access.assertCanAccessWisdom365(user);
    const sub = await this.prisma.wisdom365Subscription.findFirst({
      where: { id: subscriptionId, userId: user.userId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status !== Wisdom365SubscriptionStatus.PENDING) {
      return { subscriptionId: sub.id, status: sub.status };
    }
    return this.activateSubscription(sub.id, sub.amountPaidPence ?? 0);
  }

  async activateSubscription(subscriptionId: string, amountPaidPence: number) {
    const config = await this.prisma.wisdom365ProductConfig.findUnique({
      where: { id: 'default' },
    });
    const days = config?.subscriptionDurationDays ?? 365;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + days);

    const sub = await this.prisma.wisdom365Subscription.update({
      where: { id: subscriptionId },
      data: {
        status: Wisdom365SubscriptionStatus.ACTIVE,
        amountPaidPence,
        periodStart: now,
        periodEnd,
      },
      include: { user: true, church: true },
    });

    if (sub.user?.email && sub.churchId) {
      const renewDate = periodEnd.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      void this.email.send({
        to: sub.user.email,
        churchId: sub.churchId,
        subject: 'Wisdom365+ subscription confirmed',
        body: [
          `Hi ${sub.user.firstName},`,
          '',
          `Your Wisdom365+ annual subscription is active with ${sub.licenseCount} license(s).`,
          `Valid until ${renewDate}.`,
          '',
          'Sign in to assign your licenses to life journeys and start your daily wisdom.',
          '',
          'Blessings,',
          'Church_Hub',
        ].join('\n'),
        html: `<p>Hi ${sub.user.firstName},</p>
<p>Your <strong>Wisdom365+</strong> annual subscription is active with <strong>${sub.licenseCount}</strong> license(s).</p>
<p>Valid until <strong>${renewDate}</strong>.</p>
<p><a href="${process.env.WEB_APP_URL ?? 'http://localhost:3001'}/dashboard/wisdom365/assign">Assign your journeys</a> and begin your daily wisdom.</p>`,
      });
    }

    return { subscriptionId: sub.id, status: sub.status, licenseCount: sub.licenseCount };
  }

  async handleStripeCheckoutCompleted(sessionId: string, metadata: Record<string, string>) {
    const subscriptionId = metadata.wisdom365SubscriptionId;
    if (!subscriptionId) return;

    const sub = await this.prisma.wisdom365Subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub || sub.status === Wisdom365SubscriptionStatus.ACTIVE) return;

    await this.prisma.wisdom365Subscription.update({
      where: { id: subscriptionId },
      data: {
        stripeCheckoutSessionId: sessionId,
        stripeCustomerId: metadata.customerId ?? undefined,
      },
    });

    await this.activateSubscription(subscriptionId, sub.amountPaidPence ?? 0);
  }

  async assignVariants(
    user: AuthUser,
    subscriptionId: string,
    variantSlugs: Wisdom365VariantSlug[],
    kidsGrants?: Array<{ childMemberId: string; childDisplayName: string }>,
  ) {
    await this.access.assertCanAccessWisdom365(user);

    const sub = await this.prisma.wisdom365Subscription.findFirst({
      where: {
        id: subscriptionId,
        userId: user.userId,
        status: Wisdom365SubscriptionStatus.ACTIVE,
      },
      include: { assignments: { where: { isActive: true } } },
    });
    if (!sub) throw new NotFoundException('Active subscription not found');

    const remaining = sub.licenseCount - sub.assignments.length;
    if (variantSlugs.length > remaining) {
      throw new BadRequestException(
        `You can assign ${remaining} more license(s); ${variantSlugs.length} selected`,
      );
    }

    const uniqueSlugs = [...new Set(variantSlugs)];
    if (uniqueSlugs.length !== variantSlugs.length) {
      throw new BadRequestException('Duplicate variants are not allowed');
    }

    const variants = await this.prisma.wisdom365Variant.findMany({
      where: { slug: { in: uniqueSlugs }, isActive: true },
    });
    if (variants.length !== uniqueSlugs.length) {
      throw new BadRequestException('One or more variants are invalid or inactive');
    }

    const alreadyAssigned = sub.assignments.map((a) => a.variantId);
    for (const v of variants) {
      if (alreadyAssigned.includes(v.id)) {
        throw new BadRequestException(`${v.name} is already assigned on this subscription`);
      }
    }

    const kidsSlug = Wisdom365VariantSlug.KIDS;
    const kidsVariant = variants.find((v) => v.slug === kidsSlug);
    if (kidsVariant) {
      if (!kidsGrants?.length) {
        throw new BadRequestException('Kids journey requires parent-managed child selection');
      }
      for (const grant of kidsGrants) {
        const child = await this.prisma.member.findFirst({
          where: { id: grant.childMemberId, churchId: user.churchId! },
        });
        if (!child) throw new BadRequestException('Child member not found in your church');

        await this.prisma.wisdom365KidsGrant.upsert({
          where: {
            parentUserId_childMemberId_variantId: {
              parentUserId: user.userId,
              childMemberId: grant.childMemberId,
              variantId: kidsVariant.id,
            },
          },
          create: {
            parentUserId: user.userId,
            childMemberId: grant.childMemberId,
            variantId: kidsVariant.id,
            childDisplayName: grant.childDisplayName,
            isEnabled: true,
          },
          update: { isEnabled: true, childDisplayName: grant.childDisplayName },
        });
      }
    }

    const created = [];
    for (const variant of variants) {
      const assignment = await this.prisma.wisdom365LicenseAssignment.create({
        data: {
          subscriptionId: sub.id,
          variantId: variant.id,
          userId: user.userId,
          assignedByUserId: user.userId,
          parentUserId: variant.slug === kidsSlug ? user.userId : null,
          childMemberId:
            variant.slug === kidsSlug ? kidsGrants?.[0]?.childMemberId ?? null : null,
          isActive: true,
        },
        include: { variant: true },
      });
      created.push(assignment);

      await this.prisma.wisdom365MemberPrefs.upsert({
        where: {
          userId_variantId: { userId: user.userId, variantId: variant.id },
        },
        create: {
          userId: user.userId,
          variantId: variant.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
        },
        update: {},
      });
    }

    void this.sendAssignmentEmail(
      user,
      created.map((a) => a.variant.name),
    );

    return created.map((a) => ({
      assignmentId: a.id,
      variant: a.variant,
    }));
  }

  private async sendAssignmentEmail(user: AuthUser, variantNames: string[]) {
    if (!user.email || !user.churchId || variantNames.length === 0) return;
    void this.email.send({
      to: user.email,
      churchId: user.churchId,
      subject: 'Your Wisdom365+ journeys are ready',
      body: [
        'Your Wisdom365+ journeys have been provisioned:',
        ...variantNames.map((n) => `• ${n}`),
        '',
        'Open Wisdom365+ in Church_Hub to start today\'s reading.',
      ].join('\n'),
      html: `<p>Your <strong>Wisdom365+</strong> journeys are ready:</p><ul>${variantNames.map((n) => `<li>${n}</li>`).join('')}</ul><p><a href="${process.env.WEB_APP_URL ?? 'http://localhost:3001'}/dashboard/wisdom365">Open Wisdom365+</a></p>`,
    });
  }

  async listFamilyChildren(user: AuthUser) {
    const churchId = await this.access.assertChurchMember(user);
    const member = await this.prisma.member.findFirst({
      where: { userId: user.userId, churchId },
      select: { id: true, familyId: true },
    });
    if (!member?.familyId) return [];

    const children = await this.prisma.member.findMany({
      where: {
        churchId,
        familyId: member.familyId,
        id: { not: member.id },
      },
      select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
      orderBy: { firstName: 'asc' },
    });

    return children.map((c) => ({
      id: c.id,
      displayName: `${c.firstName} ${c.lastName}`.trim(),
      dateOfBirth: c.dateOfBirth,
    }));
  }
}
