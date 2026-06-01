import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  DevotionalGroupMemberRole,
  DevotionalMeetupRecurrence,
  DevotionalMeetupRsvpStatus,
  DevotionalReminderChannel,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.module';
import { EmailAdapter } from '../../notifications/adapters/email.adapter';
import {
  addRecurrenceInterval,
  memberLabel,
  parseReminderOffsets,
} from '../devotional-meetup.util';
import {
  CreateMeetupDto,
  MeetupPostEventDto,
  MeetupReminderOffsetsDto,
  UpdateMeetupDto,
} from '../dto/meetup.dto';

const ADMIN_ROLES: DevotionalGroupMemberRole[] = ['ADMIN', 'CO_ADMIN'];
const REMINDER_CHANNELS: DevotionalReminderChannel[] = ['IN_APP', 'EMAIL', 'PUSH'];

@Injectable()
export class DevotionalMeetupsService {
  private readonly logger = new Logger(DevotionalMeetupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  private meetupInclude() {
    return {
      host: { select: { id: true, firstName: true, lastName: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true } },
      group: { select: { id: true, name: true } },
      attendees: {
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, userId: true } },
        },
      },
    };
  }

  private async resolveMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });
    if (!member) throw new BadRequestException('Member profile required');
    return member;
  }

  private async assertGroupAdmin(groupId: string, memberId: string) {
    const m = await this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    if (!m || m.status !== 'ACTIVE' || !ADMIN_ROLES.includes(m.role)) {
      throw new ForbiddenException('Group admin or co-admin required');
    }
    return m;
  }

  private async assertGroupMember(groupId: string, memberId: string) {
    const m = await this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    if (!m || m.status !== 'ACTIVE') {
      throw new ForbiddenException('Active group membership required');
    }
    return m;
  }

  private serializeMeetup(
    row: Prisma.DevotionalMeetupGetPayload<{ include: ReturnType<DevotionalMeetupsService['meetupInclude']> }>,
    viewerMemberId: string,
  ) {
    const offsets = parseReminderOffsets(row.reminderOffsetsMinutes);
    const attending = row.attendees.filter((a) => a.status === 'ACCEPTED');
    const pending = row.attendees.filter((a) => a.status === 'PENDING');
    const declined = row.attendees.filter((a) => a.status === 'DECLINED');
    const myRsvp = row.attendees.find((a) => a.memberId === viewerMemberId);

    const past = row.startsAt < new Date();
    const needsFollowUp =
      past &&
      row.status === 'COMPLETED' &&
      !row.postEventCompletedAt &&
      (row.groupId ? true : false);

    return {
      id: row.id,
      churchId: row.churchId,
      groupId: row.groupId,
      planId: row.planId,
      title: row.title,
      description: row.description,
      location: row.location,
      onlineLink: row.onlineLink,
      locationType: row.locationType,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      recurrence: row.recurrence,
      recurrenceSeriesId: row.recurrenceSeriesId,
      status: row.status,
      reminderOffsetsMinutes: offsets,
      postEventSummary: row.postEventSummary,
      postEventPrayerPoints: row.postEventPrayerPoints,
      postEventActionSteps: row.postEventActionSteps,
      postEventProgressNote: row.postEventProgressNote,
      postEventCompletedAt: row.postEventCompletedAt?.toISOString() ?? null,
      needsFollowUp,
      host: row.host ? { id: row.host.id, name: memberLabel(row.host) } : null,
      group: row.group,
      myRsvpStatus: myRsvp?.status ?? null,
      rsvp: {
        attending: attending.map((a) => ({
          memberId: a.memberId,
          name: memberLabel(a.member),
        })),
        pending: pending.map((a) => ({
          memberId: a.memberId,
          name: memberLabel(a.member),
        })),
        declined: declined.map((a) => ({
          memberId: a.memberId,
          name: memberLabel(a.member),
        })),
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async list(
    churchId: string,
    userId: string,
    groupId: string,
    view: 'upcoming' | 'past' | 'all' = 'upcoming',
  ) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertGroupMember(groupId, member.id);
    const now = new Date();

    const where: Prisma.DevotionalMeetupWhereInput = { churchId, groupId };
    if (view === 'upcoming') {
      where.status = 'SCHEDULED';
      where.startsAt = { gte: now };
    } else if (view === 'past') {
      where.OR = [{ status: 'COMPLETED' }, { status: 'CANCELLED' }, { startsAt: { lt: now } }];
    }

    const rows = await this.prisma.devotionalMeetup.findMany({
      where,
      orderBy: view === 'past' ? { startsAt: 'desc' } : { startsAt: 'asc' },
      take: 100,
      include: this.meetupInclude(),
    });
    return rows.map((r) => this.serializeMeetup(r, member.id));
  }

  async calendar(churchId: string, userId: string, groupId: string, year: number, month: number) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertGroupMember(groupId, member.id);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const rows = await this.prisma.devotionalMeetup.findMany({
      where: {
        churchId,
        groupId,
        status: { not: 'CANCELLED' },
        startsAt: { gte: start, lte: end },
      },
      orderBy: { startsAt: 'asc' },
      include: this.meetupInclude(),
    });

    return {
      year,
      month,
      days: rows.map((r) => ({
        date: r.startsAt.toISOString().slice(0, 10),
        meetup: this.serializeMeetup(r, member.id),
      })),
    };
  }

  async getOne(churchId: string, userId: string, meetupId: string) {
    const member = await this.resolveMember(churchId, userId);
    const row = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
      include: this.meetupInclude(),
    });
    if (!row?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupMember(row.groupId, member.id);
    return this.serializeMeetup(row, member.id);
  }

  async create(churchId: string, userId: string, dto: CreateMeetupDto) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertGroupAdmin(dto.groupId, member.id);

    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) throw new BadRequestException('Invalid startsAt');

    const seriesId = dto.recurrence && dto.recurrence !== 'NONE' ? randomUUID() : null;
    const offsets = dto.reminderOffsetsMinutes ?? parseReminderOffsets(null);

    const meetup = await this.prisma.devotionalMeetup.create({
      data: {
        churchId,
        groupId: dto.groupId,
        planId: dto.planId,
        hostId: member.id,
        createdById: member.id,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        onlineLink: dto.onlineLink?.trim(),
        locationType: dto.locationType,
        startsAt,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        recurrence: dto.recurrence ?? 'NONE',
        recurrenceSeriesId: seriesId,
        reminderOffsetsMinutes: offsets as unknown as Prisma.InputJsonValue,
      },
      include: this.meetupInclude(),
    });

    await this.seedGroupInvites(meetup.id, dto.groupId);
    return this.serializeMeetup(meetup, member.id);
  }

  private async seedGroupInvites(meetupId: string, groupId: string) {
    const members = await this.prisma.devotionalGroupMember.findMany({
      where: { groupId, status: 'ACTIVE' },
      select: { memberId: true },
    });
    if (!members.length) return;
    await this.prisma.devotionalMeetupAttendee.createMany({
      data: members.map((m) => ({
        meetupId,
        memberId: m.memberId,
        status: 'PENDING' as DevotionalMeetupRsvpStatus,
      })),
      skipDuplicates: true,
    });
  }

  async update(churchId: string, userId: string, meetupId: string, dto: UpdateMeetupDto) {
    const member = await this.resolveMember(churchId, userId);
    const existing = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
    });
    if (!existing?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupAdmin(existing.groupId, member.id);
    if (existing.status === 'CANCELLED') throw new BadRequestException('Cannot edit cancelled meetup');

    const row = await this.prisma.devotionalMeetup.update({
      where: { id: meetupId },
      data: {
        title: dto.title?.trim(),
        description: dto.description?.trim(),
        location: dto.location?.trim(),
        onlineLink: dto.onlineLink?.trim(),
        locationType: dto.locationType,
        recurrence: dto.recurrence,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
      include: this.meetupInclude(),
    });

    await this.rescheduleAcceptedReminders(meetupId);
    return this.serializeMeetup(row, member.id);
  }

  async cancel(churchId: string, userId: string, meetupId: string) {
    const member = await this.resolveMember(churchId, userId);
    const existing = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
    });
    if (!existing?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupAdmin(existing.groupId, member.id);

    await this.prisma.devotionalMeetupReminder.updateMany({
      where: { meetupId, status: 'PENDING' },
      data: { status: 'DISMISSED' },
    });

    const row = await this.prisma.devotionalMeetup.update({
      where: { id: meetupId },
      data: { status: 'CANCELLED' },
      include: this.meetupInclude(),
    });
    return this.serializeMeetup(row, member.id);
  }

  async duplicate(churchId: string, userId: string, meetupId: string) {
    const member = await this.resolveMember(churchId, userId);
    const source = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
      include: this.meetupInclude(),
    });
    if (!source?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupAdmin(source.groupId, member.id);

    const startsAt =
      source.recurrence !== 'NONE'
        ? addRecurrenceInterval(source.startsAt, source.recurrence)
        : addRecurrenceInterval(source.startsAt, 'WEEKLY');

    const copy = await this.prisma.devotionalMeetup.create({
      data: {
        churchId,
        groupId: source.groupId,
        planId: source.planId,
        hostId: member.id,
        createdById: member.id,
        title: source.title,
        description: source.description,
        location: source.location,
        onlineLink: source.onlineLink,
        locationType: source.locationType,
        startsAt,
        endsAt: source.endsAt
          ? new Date(startsAt.getTime() + (source.endsAt.getTime() - source.startsAt.getTime()))
          : undefined,
        recurrence: source.recurrence,
        recurrenceSeriesId: source.recurrenceSeriesId ?? source.id,
        duplicatedFromId: source.id,
        reminderOffsetsMinutes: source.reminderOffsetsMinutes as Prisma.InputJsonValue,
      },
      include: this.meetupInclude(),
    });

    await this.seedGroupInvites(copy.id, source.groupId);
    return this.serializeMeetup(copy, member.id);
  }

  async rsvp(
    churchId: string,
    userId: string,
    meetupId: string,
    status: 'ACCEPTED' | 'DECLINED',
  ) {
    const member = await this.resolveMember(churchId, userId);
    const meetup = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId, status: 'SCHEDULED' },
    });
    if (!meetup?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupMember(meetup.groupId, member.id);

    await this.prisma.devotionalMeetupAttendee.upsert({
      where: { meetupId_memberId: { meetupId, memberId: member.id } },
      create: { meetupId, memberId: member.id, status },
      update: { status },
    });

    if (status === 'ACCEPTED') {
      await this.scheduleRemindersForMember(meetupId, member.id);
    } else {
      await this.prisma.devotionalMeetupReminder.updateMany({
        where: { meetupId, memberId: member.id, status: 'PENDING' },
        data: { status: 'DISMISSED' },
      });
    }

    return this.getOne(churchId, userId, meetupId);
  }

  async updateReminderOffsets(
    churchId: string,
    userId: string,
    meetupId: string,
    dto: MeetupReminderOffsetsDto,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const meetup = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
    });
    if (!meetup?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupAdmin(meetup.groupId, member.id);

    await this.prisma.devotionalMeetup.update({
      where: { id: meetupId },
      data: { reminderOffsetsMinutes: dto.offsets as unknown as Prisma.InputJsonValue },
    });

    await this.rescheduleAcceptedReminders(meetupId);
    return this.getOne(churchId, userId, meetupId);
  }

  async savePostEvent(
    churchId: string,
    userId: string,
    meetupId: string,
    dto: MeetupPostEventDto,
  ) {
    const member = await this.resolveMember(churchId, userId);
    const meetup = await this.prisma.devotionalMeetup.findFirst({
      where: { id: meetupId, churchId },
    });
    if (!meetup?.groupId) throw new NotFoundException('Meetup not found');
    await this.assertGroupAdmin(meetup.groupId, member.id);

    const row = await this.prisma.devotionalMeetup.update({
      where: { id: meetupId },
      data: {
        postEventSummary: dto.summary?.trim(),
        postEventPrayerPoints: dto.prayerPoints?.trim(),
        postEventActionSteps: dto.actionSteps?.trim(),
        postEventProgressNote: dto.progressNote?.trim(),
        postEventCompletedAt: new Date(),
      },
      include: this.meetupInclude(),
    });
    return this.serializeMeetup(row, member.id);
  }

  private async scheduleRemindersForMember(meetupId: string, memberId: string) {
    const meetup = await this.prisma.devotionalMeetup.findUnique({
      where: { id: meetupId },
      include: {
        attendees: {
          where: { memberId, status: 'ACCEPTED' },
          include: { member: { include: { user: true } } },
        },
      },
    });
    if (!meetup || meetup.status !== 'SCHEDULED') return;

    const attendee = meetup.attendees[0];
    if (!attendee?.member.user) return;

    const offsets = parseReminderOffsets(meetup.reminderOffsetsMinutes);
    const locationLine = meetup.onlineLink
      ? `Online: ${meetup.onlineLink}`
      : meetup.location
        ? `Location: ${meetup.location}`
        : '';

    for (const offset of offsets) {
      const fireAt = new Date(meetup.startsAt.getTime() - offset * 60_000);
      if (fireAt <= new Date()) continue;

      const title = `Meetup reminder: ${meetup.title}`;
      const body = `${meetup.title} starts ${meetup.startsAt.toLocaleString()}. ${locationLine}`.trim();

      for (const channel of REMINDER_CHANNELS) {
        await this.prisma.devotionalMeetupReminder.upsert({
          where: {
            meetupId_memberId_offsetMinutes_channel: {
              meetupId,
              memberId,
              offsetMinutes: offset,
              channel,
            },
          },
          create: {
            meetupId,
            memberId,
            offsetMinutes: offset,
            channel,
            fireAt,
            title,
            body,
            status: 'PENDING',
          },
          update: { fireAt, title, body, status: 'PENDING', deliveredAt: null },
        });
      }
    }
  }

  private async rescheduleAcceptedReminders(meetupId: string) {
    await this.prisma.devotionalMeetupReminder.deleteMany({
      where: { meetupId, status: 'PENDING' },
    });
    const accepted = await this.prisma.devotionalMeetupAttendee.findMany({
      where: { meetupId, status: 'ACCEPTED' },
      select: { memberId: true },
    });
    for (const a of accepted) {
      await this.scheduleRemindersForMember(meetupId, a.memberId);
    }
  }

  /** Archive past meetups and fire due reminders (scheduler) */
  async processScheduledTasks() {
    const now = new Date();
    const archiveBefore = new Date(now.getTime() - 60 * 60_000);

    const archived = await this.prisma.devotionalMeetup.updateMany({
      where: {
        status: 'SCHEDULED',
        startsAt: { lt: archiveBefore },
      },
      data: { status: 'COMPLETED' },
    });

    const due = await this.prisma.devotionalMeetupReminder.findMany({
      where: {
        status: 'PENDING',
        fireAt: { lte: now },
        meetup: { status: 'SCHEDULED' },
      },
      include: {
        meetup: true,
        member: { include: { user: { select: { id: true, email: true, firstName: true } } } },
      },
      take: 100,
    });

    let fired = 0;
    for (const row of due) {
      const attendee = await this.prisma.devotionalMeetupAttendee.findUnique({
        where: {
          meetupId_memberId: { meetupId: row.meetupId, memberId: row.memberId },
        },
      });
      if (attendee?.status !== 'ACCEPTED') {
        await this.prisma.devotionalMeetupReminder.update({
          where: { id: row.id },
          data: { status: 'DISMISSED' },
        });
        continue;
      }

      const user = row.member.user;
      if (!user) continue;

      let notificationId: string | undefined;
      if (row.channel === 'IN_APP' || row.channel === 'PUSH' || row.channel === 'ALARM') {
        const n = await this.prisma.notification.create({
          data: {
            churchId: row.meetup.churchId,
            userId: user.id,
            type: 'DEVOTIONAL_MEETUP',
            title: row.title,
            body: row.body,
            data: { meetupId: row.meetupId, offsetMinutes: row.offsetMinutes },
          },
        });
        notificationId = n.id;
      }

      if (row.channel === 'EMAIL' && user.email) {
        try {
          await this.email.send({
            to: user.email,
            subject: row.title,
            body: row.body,
            churchId: row.meetup.churchId,
          });
        } catch (err) {
          this.logger.warn(`Meetup email failed for ${row.id}`, err);
        }
      }

      await this.prisma.devotionalMeetupReminder.update({
        where: { id: row.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: now,
          notificationId,
        },
      });
      fired += 1;
    }

    if (archived.count > 0) {
      this.logger.log(`Archived ${archived.count} past meetup(s)`);
    }
    if (fired > 0) {
      this.logger.log(`Fired ${fired} meetup reminder(s)`);
    }
  }

  /** Legacy list without auth */
  listPublic(churchId: string, groupId?: string) {
    return this.prisma.devotionalMeetup.findMany({
      where: {
        churchId,
        status: 'SCHEDULED',
        ...(groupId ? { groupId } : {}),
        startsAt: { gte: new Date() },
      },
      orderBy: { startsAt: 'asc' },
      take: 50,
    });
  }
}
