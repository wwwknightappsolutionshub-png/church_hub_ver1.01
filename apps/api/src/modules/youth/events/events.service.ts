import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { YouthPointSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { YouthGamificationService } from '../gamification/gamification.service';

const eventInclude = {
  youthGroup: { select: { id: true, name: true } },
  rsvps: {
    include: {
      member: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
    },
  },
  _count: { select: { attendance: true } },
} satisfies Prisma.YouthEventInclude;

type EventRow = Prisma.YouthEventGetPayload<{ include: typeof eventInclude }>;

@Injectable()
export class YouthEventsService {
  static readonly MODULE_KEY = 'youth/events' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: YouthGamificationService,
  ) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Link your account to a member profile to RSVP to events',
      );
    }
    return member;
  }

  private async friendMemberIds(churchId: string, memberId: string) {
    const memberships = await this.prisma.youthGroupMember.findMany({
      where: { memberId, youthGroup: { churchId } },
      select: { youthGroupId: true },
    });
    const groupIds = memberships.map((m) => m.youthGroupId);
    if (!groupIds.length) return new Set<string>();

    const peers = await this.prisma.youthGroupMember.findMany({
      where: {
        youthGroupId: { in: groupIds },
        memberId: { not: memberId },
      },
      select: { memberId: true },
    });
    return new Set(peers.map((p) => p.memberId));
  }

  private serializeEvent(
    row: EventRow,
    viewerMemberId?: string,
    friendIds?: Set<string>,
  ) {
    const going = row.rsvps.filter((r) => r.status === 'GOING');
    const interested = row.rsvps.filter((r) => r.status === 'INTERESTED');
    const publicGoing = going.filter((r) => r.visibility === 'PUBLIC');

    const friendsAttending = publicGoing
      .filter((r) => friendIds?.has(r.memberId))
      .map((r) => ({
        memberId: r.member.id,
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        avatarUrl: r.member.avatarUrl,
        status: r.status as 'GOING',
        isFriend: true,
      }));

    const myRsvp = viewerMemberId
      ? row.rsvps.find((r) => r.memberId === viewerMemberId)
      : undefined;

    const spotsLeft =
      row.maxAttendees != null
        ? Math.max(0, row.maxAttendees - going.length)
        : null;

    return {
      id: row.id,
      churchId: row.churchId,
      title: row.title,
      description: row.description,
      location: row.location,
      coverImageUrl: row.coverImageUrl,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      maxAttendees: row.maxAttendees,
      youthGroupId: row.youthGroupId,
      youthGroup: row.youthGroup,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      goingCount: going.length,
      interestedCount: interested.length,
      checkedInCount: row._count.attendance,
      spotsLeft,
      myRsvp: myRsvp
        ? {
            status: myRsvp.status,
            visibility: myRsvp.visibility,
          }
        : null,
      friendsAttending,
      friendsAttendingCount: friendsAttending.length,
      totalPublicGoing: publicGoing.length,
    };
  }

  async listEvents(
    churchId: string,
    opts: { upcomingOnly?: boolean; userId?: string },
  ) {
    const viewer = opts.userId
      ? await this.prisma.member.findFirst({
          where: { churchId, userId: opts.userId },
          select: { id: true },
        })
      : null;
    const friendIds = viewer
      ? await this.friendMemberIds(churchId, viewer.id)
      : undefined;

    const rows = await this.prisma.youthEvent.findMany({
      where: {
        churchId,
        ...(opts.upcomingOnly ? { startsAt: { gte: new Date() } } : {}),
      },
      include: eventInclude,
      orderBy: { startsAt: 'asc' },
    });

    return rows.map((r) => this.serializeEvent(r, viewer?.id, friendIds));
  }

  async getEvent(churchId: string, eventId: string, userId?: string) {
    const row = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
      include: eventInclude,
    });
    if (!row) throw new NotFoundException('Event not found');

    const viewer = userId
      ? await this.prisma.member.findFirst({
          where: { churchId, userId },
          select: { id: true },
        })
      : null;
    const friendIds = viewer
      ? await this.friendMemberIds(churchId, viewer.id)
      : undefined;

    const base = this.serializeEvent(row, viewer?.id, friendIds);
    const publicRsvps = row.rsvps
      .filter((r) => r.visibility === 'PUBLIC' || r.memberId === viewer?.id)
      .map((r) => ({
        memberId: r.member.id,
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        avatarUrl: r.member.avatarUrl,
        status: r.status,
        isFriend: friendIds?.has(r.memberId) ?? false,
      }));

    return { ...base, rsvps: publicRsvps };
  }

  async getFriendsAttending(churchId: string, userId: string, eventId: string) {
    const member = await this.requireMember(churchId, userId);
    const event = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
      include: {
        rsvps: {
          where: { status: 'GOING', visibility: 'PUBLIC' },
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true },
            },
          },
        },
      },
    });
    if (!event) throw new NotFoundException('Event not found');

    const friendIds = await this.friendMemberIds(churchId, member.id);
    const friends = event.rsvps
      .filter((r) => friendIds.has(r.memberId))
      .map((r) => ({
        memberId: r.member.id,
        firstName: r.member.firstName,
        lastName: r.member.lastName,
        avatarUrl: r.member.avatarUrl,
        status: 'GOING' as const,
        isFriend: true,
      }));

    return {
      eventId,
      count: friends.length,
      friends,
    };
  }

  createEvent(
    churchId: string,
    data: {
      title: string;
      description?: string;
      location?: string;
      coverImageUrl?: string;
      startsAt: string;
      endsAt?: string;
      youthGroupId?: string;
      maxAttendees?: number;
    },
  ) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required');
    return this.prisma.youthEvent
      .create({
        data: {
          churchId,
          title: data.title.trim(),
          description: data.description,
          location: data.location,
          coverImageUrl: data.coverImageUrl,
          startsAt: new Date(data.startsAt),
          endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
          youthGroupId: data.youthGroupId,
          maxAttendees: data.maxAttendees,
        },
        include: eventInclude,
      })
      .then((row) => this.serializeEvent(row));
  }

  async updateEvent(
    churchId: string,
    eventId: string,
    data: Partial<{
      title: string;
      description: string;
      location: string;
      coverImageUrl: string;
      startsAt: string;
      endsAt: string;
      youthGroupId: string;
      maxAttendees: number;
    }>,
  ) {
    const existing = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
    });
    if (!existing) throw new NotFoundException('Event not found');

    const row = await this.prisma.youthEvent.update({
      where: { id: eventId },
      data: {
        ...(data.title != null ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.location !== undefined ? { location: data.location } : {}),
        ...(data.coverImageUrl !== undefined ? { coverImageUrl: data.coverImageUrl } : {}),
        ...(data.startsAt ? { startsAt: new Date(data.startsAt) } : {}),
        ...(data.endsAt ? { endsAt: new Date(data.endsAt) } : {}),
        ...(data.youthGroupId !== undefined ? { youthGroupId: data.youthGroupId || null } : {}),
        ...(data.maxAttendees !== undefined ? { maxAttendees: data.maxAttendees } : {}),
      },
      include: eventInclude,
    });
    return this.serializeEvent(row);
  }

  async deleteEvent(churchId: string, eventId: string) {
    const existing = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
    });
    if (!existing) throw new NotFoundException('Event not found');
    await this.prisma.youthEvent.delete({ where: { id: eventId } });
    return { ok: true };
  }

  async rsvp(
    churchId: string,
    eventId: string,
    memberId: string,
    status = 'GOING',
    visibility = 'PUBLIC',
  ) {
    const event = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
      include: { rsvps: { where: { status: 'GOING' } } },
    });
    if (!event) throw new NotFoundException('Event not found');

    if (status === 'GOING' && event.maxAttendees != null) {
      const alreadyGoing = event.rsvps.some((r) => r.memberId === memberId);
      if (!alreadyGoing && event.rsvps.length >= event.maxAttendees) {
        throw new BadRequestException('Event is at capacity');
      }
    }

    const prev = await this.prisma.youthEventRsvp.findUnique({
      where: { eventId_memberId: { eventId, memberId } },
    });

    const rsvp = await this.prisma.youthEventRsvp.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      create: { eventId, memberId, status, visibility },
      update: { status, visibility },
    });

    if (status === 'GOING' && (!prev || prev.status !== 'GOING')) {
      await this.gamification.scoreEvent(churchId, memberId, YouthPointSource.RSVP, {
        sourceId: eventId,
        reason: 'Event RSVP',
      });
    }

    return rsvp;
  }

  async rsvpAsUser(
    churchId: string,
    userId: string,
    eventId: string,
    status = 'GOING',
    visibility = 'PUBLIC',
  ) {
    const member = await this.requireMember(churchId, userId);
    await this.rsvp(churchId, eventId, member.id, status, visibility);
    return this.getEvent(churchId, eventId, userId);
  }

  async checkInAttendance(churchId: string, eventId: string, memberId: string) {
    const event = await this.prisma.youthEvent.findFirst({
      where: { id: eventId, churchId },
    });
    if (!event) throw new NotFoundException('Event not found');

    const record = await this.prisma.youthAttendance.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      create: { eventId, memberId },
      update: { checkedAt: new Date() },
    });

    await this.gamification.recordAttendanceStreak(memberId);
    await this.gamification.scoreEvent(churchId, memberId, YouthPointSource.ATTENDANCE, {
      sourceId: eventId,
      reason: 'Event check-in',
    });

    return record;
  }
}
