import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  DevotionalReminderChannel,
  DevotionalReminderDeliveryStatus,
  DevotionalReminderFrequency,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { EmailAdapter } from '../../notifications/adapters/email.adapter';
import {
  isReminderDueNow,
  snoozeUntilFromMinutes,
} from '../devotional-reminder-time.util';
import { UpsertPlanRemindersDto, UpsertReminderPreferencesDto } from '../dto/reminder-settings.dto';
import { DevotionalProgressService } from './devotional-progress.service';

const SNOOZE_PRESETS = [10, 30, 60] as const;

@Injectable()
export class DevotionalRemindersService {
  private readonly logger = new Logger(DevotionalRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly progress: DevotionalProgressService,
  ) {}

  private async resolveMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });
    if (!member) throw new BadRequestException('Member profile required for reminders');
    return member;
  }

  async getPreferences(churchId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const pref = await this.prisma.devotionalReminderPreference.upsert({
      where: { memberId: member.id },
      create: {
        churchId,
        memberId: member.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      update: {},
    });
    return pref;
  }

  async updatePreferences(
    churchId: string,
    userId: string,
    dto: UpsertReminderPreferencesDto,
  ) {
    const member = await this.resolveMember(churchId, userId);
    return this.prisma.devotionalReminderPreference.upsert({
      where: { memberId: member.id },
      create: {
        churchId,
        memberId: member.id,
        timezone: dto.timezone ?? 'UTC',
        quietStartHour: dto.quietStartHour ?? 22,
        quietEndHour: dto.quietEndHour ?? 7,
        syncVersion: 1,
      },
      update: {
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        ...(dto.quietStartHour !== undefined ? { quietStartHour: dto.quietStartHour } : {}),
        ...(dto.quietEndHour !== undefined ? { quietEndHour: dto.quietEndHour } : {}),
        syncVersion: { increment: 1 },
      },
    });
  }

  async listMine(churchId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const [preferences, reminders] = await Promise.all([
      this.getPreferences(churchId, userId),
      this.prisma.devotionalReminder.findMany({
        where: { memberId: member.id },
        include: { plan: { select: { id: true, title: true } } },
        orderBy: [{ planId: 'asc' }, { channel: 'asc' }],
      }),
    ]);
    return { preferences, reminders, snoozePresets: SNOOZE_PRESETS };
  }

  async upsertPlanReminders(
    churchId: string,
    userId: string,
    planId: string,
    dto: UpsertPlanRemindersDto,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const plan = await this.prisma.devotionalPlan.findFirst({
      where: { id: planId, churchId, status: 'PUBLISHED' },
    });
    if (!plan) throw new NotFoundException('Published plan not found');

    const pref = await this.getPreferences(churchId, userId);
    const timezone = dto.timezone ?? pref.timezone;
    const frequency = dto.frequency ?? 'DAILY';

    const results = [];
    for (const ch of dto.channels) {
      const row = await this.prisma.devotionalReminder.upsert({
        where: {
          memberId_planId_channel: {
            memberId: member.id,
            planId,
            channel: ch.channel,
          },
        },
        create: {
          churchId,
          memberId: member.id,
          planId,
          channel: ch.channel,
          frequency,
          timezone,
          hourLocal: ch.hourLocal ?? 7,
          minuteLocal: ch.minuteLocal ?? 0,
          isEnabled: ch.isEnabled !== false,
        },
        update: {
          frequency,
          timezone,
          ...(ch.hourLocal !== undefined ? { hourLocal: ch.hourLocal } : {}),
          ...(ch.minuteLocal !== undefined ? { minuteLocal: ch.minuteLocal } : {}),
          ...(ch.isEnabled !== undefined ? { isEnabled: ch.isEnabled } : {}),
        },
      });
      results.push(row);
    }

    await this.prisma.devotionalReminderPreference.update({
      where: { memberId: member.id },
      data: { syncVersion: { increment: 1 } },
    });

    return { planId, reminders: results };
  }

  /** Cross-device sync payload */
  async syncState(churchId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const now = new Date();
    const [preferences, reminders, pendingDeliveries] = await Promise.all([
      this.getPreferences(churchId, userId),
      this.prisma.devotionalReminder.findMany({
        where: { memberId: member.id },
        include: { plan: { select: { id: true, title: true } } },
      }),
      this.prisma.devotionalReminderDelivery.findMany({
        where: {
          memberId: member.id,
          status: { in: ['PENDING', 'SNOOZED', 'DELIVERED'] },
          OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
        },
        orderBy: { firedAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      serverTime: now.toISOString(),
      syncVersion: preferences.syncVersion,
      preferences,
      reminders,
      pendingDeliveries,
      snoozePresets: SNOOZE_PRESETS,
    };
  }

  async snoozeReminder(
    churchId: string,
    userId: string,
    reminderId: string,
    minutes: number,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const until = snoozeUntilFromMinutes(minutes);
    const reminder = await this.prisma.devotionalReminder.findFirst({
      where: { id: reminderId, memberId: member.id, churchId },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');

    await this.prisma.devotionalReminder.update({
      where: { id: reminderId },
      data: { snoozedUntil: until },
    });

    await this.prisma.devotionalReminderDelivery.updateMany({
      where: {
        reminderId,
        memberId: member.id,
        status: { in: ['PENDING', 'DELIVERED', 'SNOOZED'] },
      },
      data: { status: 'SNOOZED', snoozedUntil: until },
    });

    await this.bumpSyncVersion(member.id);
    return { snoozedUntil: until.toISOString(), minutes };
  }

  async snoozeDelivery(
    churchId: string,
    userId: string,
    deliveryId: string,
    minutes: number,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const until = snoozeUntilFromMinutes(minutes);
    const delivery = await this.prisma.devotionalReminderDelivery.findFirst({
      where: { id: deliveryId, memberId: member.id, churchId },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const updated = await this.prisma.devotionalReminderDelivery.update({
      where: { id: deliveryId },
      data: { status: 'SNOOZED', snoozedUntil: until },
    });

    await this.prisma.devotionalReminder.update({
      where: { id: delivery.reminderId },
      data: { snoozedUntil: until },
    });

    await this.bumpSyncVersion(member.id);
    return { delivery: updated, snoozedUntil: until.toISOString() };
  }

  async markDeliveryDone(
    churchId: string,
    userId: string,
    deliveryId: string,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const delivery = await this.prisma.devotionalReminderDelivery.findFirst({
      where: { id: deliveryId, memberId: member.id, churchId },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const updated = await this.prisma.devotionalReminderDelivery.update({
      where: { id: deliveryId },
      data: { status: 'DONE', completedAt: new Date(), snoozedUntil: null },
    });

    if (delivery.planId && delivery.dayNumber) {
      try {
        await this.progress.markDayComplete(
          churchId,
          userId,
          delivery.planId,
          delivery.dayNumber,
        );
      } catch {
        /* progress optional */
      }
    }

    if (delivery.notificationId) {
      await this.prisma.notification.update({
        where: { id: delivery.notificationId },
        data: { readAt: new Date() },
      });
    }

    await this.bumpSyncVersion(member.id);
    return updated;
  }

  private async bumpSyncVersion(memberId: string) {
    await this.prisma.devotionalReminderPreference.updateMany({
      where: { memberId },
      data: { syncVersion: { increment: 1 } },
    });
  }

  /** Called every minute by scheduler */
  async processDueReminders() {
    const now = new Date();
    const reminders = await this.prisma.devotionalReminder.findMany({
      where: {
        isEnabled: true,
        OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      },
      include: {
        member: { include: { user: { select: { id: true, email: true } } } },
        plan: { select: { id: true, title: true, startDate: true, status: true } },
      },
    });

    let fired = 0;
    for (const reminder of reminders) {
      const user = reminder.member.user;
      if (!user) continue;
      if (reminder.plan && reminder.plan.status !== 'PUBLISHED') continue;

      const pref = await this.prisma.devotionalReminderPreference.findUnique({
        where: { memberId: reminder.memberId },
      });
      const quietStart = pref?.quietStartHour ?? 22;
      const quietEnd = pref?.quietEndHour ?? 7;
      const timezone = reminder.timezone || pref?.timezone || 'UTC';

      if (
        !isReminderDueNow({
          now,
          timezone,
          frequency: reminder.frequency,
          hourLocal: reminder.hourLocal,
          minuteLocal: reminder.minuteLocal,
          lastSentAt: reminder.lastSentAt,
          quietStartHour: quietStart,
          quietEndHour: quietEnd,
        })
      ) {
        continue;
      }

      await this.fireReminder(
        { ...reminder, member: { user } },
        quietStart,
        quietEnd,
      );
      fired += 1;
    }

    if (fired > 0) {
      this.logger.log(`Fired ${fired} devotional reminder(s)`);
    }
  }

  private async fireReminder(
    reminder: {
      id: string;
      churchId: string;
      memberId: string;
      planId: string | null;
      channel: DevotionalReminderChannel;
      frequency: DevotionalReminderFrequency;
      member: { user: { id: string; email: string } };
      plan: { id: string; title: string; startDate: Date } | null;
    },
    _quietStart: number,
    _quietEnd: number,
  ) {
    const userId = reminder.member.user.id;
    const planTitle = reminder.plan?.title ?? 'Devotional';
    const dayNumber = reminder.plan
      ? this.dayNumberFromStart(reminder.plan.startDate)
      : null;

    const title = `Devotional: ${planTitle}`;
    const body =
      dayNumber != null
        ? `Day ${dayNumber} is ready — take a moment for today's reading.`
        : `Time for your devotional reading.`;

    const delivery = await this.prisma.devotionalReminderDelivery.create({
      data: {
        churchId: reminder.churchId,
        memberId: reminder.memberId,
        userId,
        reminderId: reminder.id,
        planId: reminder.planId,
        planTitle,
        dayNumber: dayNumber ?? undefined,
        channel: reminder.channel,
        frequency: reminder.frequency,
        status: 'DELIVERED',
        title,
        body,
      },
    });

    let notificationId: string | undefined;

    if (
      reminder.channel === 'IN_APP' ||
      reminder.channel === 'PUSH' ||
      reminder.channel === 'ALARM'
    ) {
      const n = await this.prisma.notification.create({
        data: {
          churchId: reminder.churchId,
          userId,
          title,
          body,
          type: 'devotional_reminder',
          data: {
            module: 'devotional-hub',
            deliveryId: delivery.id,
            planId: reminder.planId,
            dayNumber,
            actions: ['snooze', 'done'],
          },
        },
      });
      notificationId = n.id;
    }

    if (reminder.channel === 'EMAIL') {
      await this.email.send({
        to: reminder.member.user.email,
        subject: title,
        body: `${body}\n\nOpen Devotional Hub in Church Hub to continue.`,
        churchId: reminder.churchId,
      });
    }

    await this.prisma.devotionalReminderDelivery.update({
      where: { id: delivery.id },
      data: { notificationId },
    });

    await this.prisma.devotionalReminder.update({
      where: { id: reminder.id },
      data: { lastSentAt: new Date(), snoozedUntil: null },
    });

    await this.bumpSyncVersion(reminder.memberId);
  }

  private dayNumberFromStart(startDate: Date): number {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  async upsert(
    churchId: string,
    userId: string,
    data: {
      channel: DevotionalReminderChannel;
      hourLocal?: number;
      minuteLocal?: number;
      timezone?: string;
      planId?: string;
      isEnabled?: boolean;
      frequency?: DevotionalReminderFrequency;
    },
  ) {
    const member = await this.resolveMember(churchId, userId);
    const pref = await this.getPreferences(churchId, userId);
    const timezone = data.timezone ?? pref.timezone;

    const planId = data.planId ?? null;
    if (planId === null) {
      const existing = await this.prisma.devotionalReminder.findFirst({
        where: { memberId: member.id, planId: null, channel: data.channel },
      });
      if (existing) {
        const updated = await this.prisma.devotionalReminder.update({
          where: { id: existing.id },
          data: {
            ...(data.hourLocal !== undefined ? { hourLocal: data.hourLocal } : {}),
            ...(data.minuteLocal !== undefined ? { minuteLocal: data.minuteLocal } : {}),
            timezone,
            ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
            ...(data.frequency ? { frequency: data.frequency } : {}),
          },
        });
        await this.bumpSyncVersion(member.id);
        return updated;
      }
      const created = await this.prisma.devotionalReminder.create({
        data: {
          churchId,
          memberId: member.id,
          channel: data.channel,
          frequency: data.frequency ?? 'DAILY',
          hourLocal: data.hourLocal ?? 7,
          minuteLocal: data.minuteLocal ?? 0,
          timezone,
          isEnabled: data.isEnabled !== false,
        },
      });
      await this.bumpSyncVersion(member.id);
      return created;
    }

    const row = await this.prisma.devotionalReminder.upsert({
      where: {
        memberId_planId_channel: {
          memberId: member.id,
          planId,
          channel: data.channel,
        },
      },
      create: {
        churchId,
        memberId: member.id,
        planId: data.planId,
        channel: data.channel,
        frequency: data.frequency ?? 'DAILY',
        hourLocal: data.hourLocal ?? 7,
        minuteLocal: data.minuteLocal ?? 0,
        timezone,
        isEnabled: data.isEnabled !== false,
      },
      update: {
        ...(data.hourLocal !== undefined ? { hourLocal: data.hourLocal } : {}),
        ...(data.minuteLocal !== undefined ? { minuteLocal: data.minuteLocal } : {}),
        timezone,
        ...(data.isEnabled !== undefined ? { isEnabled: data.isEnabled } : {}),
        ...(data.frequency ? { frequency: data.frequency } : {}),
      },
    });

    await this.bumpSyncVersion(member.id);
    return row;
  }
}
