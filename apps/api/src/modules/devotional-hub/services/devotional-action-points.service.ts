import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DevotionalReminderChannel, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { EmailAdapter } from '../../notifications/adapters/email.adapter';
import { isReminderDueNow } from '../devotional-reminder-time.util';
import { isoWeekKey } from '../devotional-week.util';
import { CreateActionPointDto, UpdateActionPointDto } from '../dto/action-points.dto';
import { DevotionalChallengesService } from './devotional-challenges.service';

@Injectable()
export class DevotionalActionPointsService {
  private readonly logger = new Logger(DevotionalActionPointsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly challenges: DevotionalChallengesService,
  ) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!member) throw new BadRequestException('Member profile required');
    return member;
  }

  private serialize(row: {
    id: string;
    title: string;
    notes: string | null;
    planId: string | null;
    dayId: string | null;
    groupId: string | null;
    challengeId: string | null;
    dueAt: Date | null;
    weekKey: string | null;
    status: string;
    completedAt: Date | null;
    skippedAt: Date | null;
    remindersEnabled: boolean;
    reminderFrequency: string | null;
    reminderChannels: Prisma.JsonValue;
    reminderHourLocal: number;
    reminderMinuteLocal: number;
    reminderTimezone: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const channels = Array.isArray(row.reminderChannels)
      ? (row.reminderChannels as DevotionalReminderChannel[])
      : [];
    return {
      id: row.id,
      title: row.title,
      notes: row.notes,
      planId: row.planId,
      dayId: row.dayId,
      groupId: row.groupId,
      challengeId: row.challengeId,
      dueAt: row.dueAt?.toISOString() ?? null,
      weekKey: row.weekKey,
      status: row.status,
      completedAt: row.completedAt?.toISOString() ?? null,
      skippedAt: row.skippedAt?.toISOString() ?? null,
      remindersEnabled: row.remindersEnabled,
      reminderFrequency: row.reminderFrequency,
      reminderChannels: channels,
      reminderHourLocal: row.reminderHourLocal,
      reminderMinuteLocal: row.reminderMinuteLocal,
      reminderTimezone: row.reminderTimezone,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listMine(churchId: string, userId: string, weekKey?: string, status?: string) {
    const member = await this.requireMember(churchId, userId);
    const rows = await this.prisma.devotionalActionPoint.findMany({
      where: {
        churchId,
        memberId: member.id,
        ...(weekKey ? { weekKey } : {}),
        ...(status ? { status: status as 'PENDING' | 'COMPLETED' | 'SKIPPED' } : {}),
      },
      orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
    return rows.map((r) => this.serialize(r));
  }

  async create(churchId: string, userId: string, dto: CreateActionPointDto) {
    const member = await this.requireMember(churchId, userId);
    const weekKey = isoWeekKey();
    const row = await this.prisma.devotionalActionPoint.create({
      data: {
        churchId,
        memberId: member.id,
        title: dto.title.trim(),
        notes: dto.notes?.trim(),
        planId: dto.planId,
        dayId: dto.dayId,
        groupId: dto.groupId,
        challengeId: dto.challengeId,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        weekKey,
        remindersEnabled: dto.remindersEnabled ?? false,
        reminderFrequency: dto.reminderFrequency,
        reminderChannels: (dto.reminderChannels ?? ['IN_APP']) as unknown as Prisma.InputJsonValue,
        reminderHourLocal: dto.reminderHourLocal ?? 9,
        reminderMinuteLocal: dto.reminderMinuteLocal ?? 0,
        reminderTimezone: dto.reminderTimezone ?? 'UTC',
      },
    });
    return this.serialize(row);
  }

  async update(churchId: string, userId: string, id: string, dto: UpdateActionPointDto) {
    const member = await this.requireMember(churchId, userId);
    const existing = await this.prisma.devotionalActionPoint.findFirst({
      where: { id, churchId, memberId: member.id },
    });
    if (!existing) throw new NotFoundException('Action point not found');

    const row = await this.prisma.devotionalActionPoint.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        notes: dto.notes?.trim(),
        dueAt: dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : undefined,
        remindersEnabled: dto.remindersEnabled,
        reminderFrequency: dto.reminderFrequency,
        reminderChannels:
          dto.reminderChannels !== undefined
            ? (dto.reminderChannels as unknown as Prisma.InputJsonValue)
            : undefined,
        reminderHourLocal: dto.reminderHourLocal,
        reminderMinuteLocal: dto.reminderMinuteLocal,
        reminderTimezone: dto.reminderTimezone,
      },
    });
    return this.serialize(row);
  }

  async complete(churchId: string, userId: string, id: string) {
    const member = await this.requireMember(churchId, userId);
    const before = await this.prisma.devotionalActionPoint.findFirst({
      where: { id, churchId, memberId: member.id },
      select: { challengeId: true, status: true },
    });
    const row = await this.prisma.devotionalActionPoint.updateMany({
      where: { id, churchId, memberId: member.id },
      data: { status: 'COMPLETED', completedAt: new Date(), skippedAt: null },
    });
    if (row.count === 0) throw new NotFoundException('Action point not found');
    if (before?.challengeId && before.status !== 'COMPLETED') {
      await this.challenges.incrementFromActionPoint(
        churchId,
        member.id,
        before.challengeId,
      );
    }
    return this.prisma.devotionalActionPoint.findUnique({ where: { id } }).then((r) =>
      r ? this.serialize(r) : null,
    );
  }

  async skip(churchId: string, userId: string, id: string) {
    const member = await this.requireMember(churchId, userId);
    const row = await this.prisma.devotionalActionPoint.updateMany({
      where: { id, churchId, memberId: member.id },
      data: { status: 'SKIPPED', skippedAt: new Date(), completedAt: null },
    });
    if (row.count === 0) throw new NotFoundException('Action point not found');
    return this.prisma.devotionalActionPoint.findUnique({ where: { id } }).then((r) =>
      r ? this.serialize(r) : null,
    );
  }

  async remove(churchId: string, userId: string, id: string) {
    const member = await this.requireMember(churchId, userId);
    const result = await this.prisma.devotionalActionPoint.deleteMany({
      where: { id, churchId, memberId: member.id },
    });
    if (result.count === 0) throw new NotFoundException('Action point not found');
    return { ok: true };
  }

  /** Process hourly/daily action-point reminders (called from scheduler) */
  async processDueReminders() {
    const now = new Date();
    const points = await this.prisma.devotionalActionPoint.findMany({
      where: {
        status: 'PENDING',
        remindersEnabled: true,
        reminderFrequency: { not: null },
      },
      include: {
        member: { include: { user: { select: { id: true, email: true } } } },
      },
      take: 200,
    });

    let fired = 0;
    for (const point of points) {
      const user = point.member.user;
      if (!user || !point.reminderFrequency) continue;

      const pref = await this.prisma.devotionalReminderPreference.findUnique({
        where: { memberId: point.memberId },
      });
      const quietStart = pref?.quietStartHour ?? 22;
      const quietEnd = pref?.quietEndHour ?? 7;
      const timezone = point.reminderTimezone || pref?.timezone || 'UTC';

      if (
        !isReminderDueNow({
          now,
          timezone,
          frequency: point.reminderFrequency,
          hourLocal: point.reminderHourLocal,
          minuteLocal: point.reminderMinuteLocal,
          lastSentAt: point.lastReminderAt,
          quietStartHour: quietStart,
          quietEndHour: quietEnd,
        })
      ) {
        continue;
      }

      const channels = Array.isArray(point.reminderChannels)
        ? (point.reminderChannels as DevotionalReminderChannel[])
        : ['IN_APP'];

      const title = `Action point: ${point.title}`;
      const body = point.notes?.trim() || 'Take a step on your devotional action point today.';

      for (const channel of channels) {
        if (channel === 'IN_APP' || channel === 'PUSH' || channel === 'ALARM') {
          await this.prisma.notification.create({
            data: {
              churchId: point.churchId,
              userId: user.id,
              type: 'DEVOTIONAL_ACTION',
              title,
              body,
              data: { actionPointId: point.id },
            },
          });
        }
        if (channel === 'EMAIL' && user.email) {
          try {
            await this.email.send({
              to: user.email,
              subject: title,
              body,
              churchId: point.churchId,
            });
          } catch (err) {
            this.logger.warn(`Action point email failed ${point.id}`, err);
          }
        }
      }

      await this.prisma.devotionalActionPoint.update({
        where: { id: point.id },
        data: { lastReminderAt: now },
      });
      fired += 1;
    }

    if (fired > 0) this.logger.log(`Fired ${fired} action point reminder(s)`);
  }
}
