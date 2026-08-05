import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatChannelType, DepartmentCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailAdapter } from '../notifications/adapters/email.adapter';
import { ANNOUNCEMENT_CATEGORIES, MODERATION_KEYWORDS } from './communications.constants';
import { DevotionalPlansService } from '../devotional-hub/services/devotional-plans.service';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
    private readonly devotionalPlans: DevotionalPlansService,
  ) {}

  async getStats(churchId: string) {
    const [
      announcements,
      sermons,
      devotionals,
      channels,
      notifications,
      unreadMessages,
      unreadInApp,
      queuePending,
      conversations,
    ] = await Promise.all([
      this.prisma.announcement.count({
        where: { churchId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      }),
      this.prisma.sermon.count({ where: { churchId } }),
      this.prisma.devotionalPlan.count({ where: { churchId, isActive: true } }),
      this.prisma.chatChannel.count({ where: { churchId, isArchived: false } }),
      this.prisma.notification.count({ where: { churchId } }),
      this.prisma.notification.count({ where: { churchId, readAt: null } }),
      this.prisma.inAppMessage.count({ where: { churchId, readAt: null } }),
      this.prisma.communicationQueueItem.count({
        where: { churchId, status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.prisma.conversation.count({ where: { churchId } }),
    ]);
    return {
      announcements,
      sermons,
      devotionals,
      channels,
      notifications,
      unreadMessages,
      unreadInApp,
      queuePending,
      conversations,
    };
  }

  // ─── Announcements ─────────────────────────────────────────

  listAnnouncements(
    churchId: string,
    includeExpired = false,
    category?: string,
  ) {
    return this.prisma.announcement.findMany({
      where: {
        churchId,
        ...(category ? { category } : {}),
        ...(includeExpired ? {} : { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }),
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
  }

  createAnnouncement(
    churchId: string,
    data: { title: string; content: string; authorId?: string; isPinned?: boolean; category?: string; expiresAt?: string },
  ) {
    return this.prisma.announcement.create({
      data: {
        churchId,
        title: data.title,
        content: data.content,
        authorId: data.authorId,
        isPinned: data.isPinned,
        category: data.category,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });
  }

  async updateAnnouncement(churchId: string, id: string, data: Prisma.AnnouncementUpdateInput) {
    const row = await this.prisma.announcement.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.update({ where: { id }, data });
  }

  async deleteAnnouncement(churchId: string, id: string) {
    const row = await this.prisma.announcement.findFirst({ where: { id, churchId } });
    if (!row) throw new NotFoundException('Announcement not found');
    return this.prisma.announcement.delete({ where: { id } });
  }

  // ─── Sermons ───────────────────────────────────────────────

  listSermons(churchId: string, search?: string) {
    return this.prisma.sermon.findMany({
      where: {
        churchId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { speaker: { contains: search, mode: 'insensitive' } },
                { seriesName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { preachedAt: 'desc' },
    });
  }

  createSermon(
    churchId: string,
    data: {
      title: string;
      speaker?: string;
      description?: string;
      audioUrl?: string;
      videoUrl?: string;
      notesUrl?: string;
      seriesName?: string;
      preachedAt?: string;
      durationSec?: number;
    },
  ) {
    return this.prisma.sermon.create({
      data: {
        churchId,
        ...data,
        preachedAt: data.preachedAt ? new Date(data.preachedAt) : undefined,
      },
    });
  }

  // ─── Devotionals ───────────────────────────────────────────

  listDevotionals(churchId: string, activeOnly = true) {
    return this.devotionalPlans.listActive(churchId);
  }

  createDevotional(
    churchId: string,
    data: {
      title: string;
      description?: string;
      startDate: string;
      endDate?: string;
      entries?: unknown[];
    },
  ) {
    return this.devotionalPlans.create(churchId, undefined, {
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      entries: data.entries as Array<{
        day?: number;
        title?: string;
        scripture?: string;
        reflection?: string;
      }>,
    });
  }

  // ─── Push / notifications ──────────────────────────────────

  listNotifications(churchId: string, userId?: string) {
    return this.prisma.notification.findMany({
      where: { churchId, ...(userId ? { userId } : {}) },
      orderBy: { sentAt: 'desc' },
      take: 100,
    });
  }

  async markNotificationRead(churchId: string, id: string, userId: string) {
    const n = await this.prisma.notification.findFirst({ where: { id, churchId, userId } });
    if (!n) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
  }

  async sendBroadcast(
    churchId: string,
    data: { title: string; body: string; sendPush?: boolean; sendEmail?: boolean; type?: string },
  ) {
    const sendPush = data.sendPush !== false;
    const sendEmail = data.sendEmail === true;
    const type = data.type ?? 'BROADCAST';
    const results = { pushCount: 0, emailCount: 0, notifications: [] as unknown[] };

    if (sendPush) {
      const users = await this.prisma.user.findMany({ where: { churchId }, select: { id: true } });
      const notifications = await Promise.all(
        users.map((user) =>
          this.prisma.notification.create({
            data: {
              churchId,
              userId: user.id,
              title: data.title,
              body: data.body,
              type,
              data: { channel: 'push' } as Prisma.InputJsonValue,
            },
          }),
        ),
      );
      results.pushCount = notifications.length;
      results.notifications = notifications;
    }

    if (sendEmail) {
      const members = await this.prisma.member.findMany({
        where: { churchId, email: { not: null } },
        select: { email: true },
      });
      const uniqueEmails = [...new Set(members.map((m) => m.email).filter(Boolean) as string[])];
      await Promise.all(
        uniqueEmails.map((to) =>
          this.email.send({ to, subject: data.title, body: data.body, churchId }),
        ),
      );
      results.emailCount = uniqueEmails.length;
    }

    return results;
  }

  sendNotification(
    churchId: string,
    data: { userId?: string; title: string; body: string; type: string; data?: Record<string, unknown> },
  ) {
    return this.prisma.notification.create({
      data: {
        churchId,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type,
        data: (data.data ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  // ─── In-app messages ───────────────────────────────────────

  listInAppMessages(churchId: string, userId: string, box: 'inbox' | 'sent' = 'inbox') {
    return this.prisma.inAppMessage.findMany({
      where: {
        churchId,
        ...(box === 'inbox' ? { recipientId: userId } : { senderId: userId }),
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, email: true } },
        recipient: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  listMessageRecipients(churchId: string) {
    return this.prisma.user.findMany({
      where: { churchId, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    });
  }

  async sendInAppMessage(
    churchId: string,
    senderId: string,
    data: { recipientId: string; subject?: string; body: string },
  ) {
    if (!data.body?.trim()) throw new BadRequestException('Message body is required');
    if (senderId === data.recipientId) throw new BadRequestException('Cannot message yourself');
    const recipient = await this.prisma.user.findFirst({ where: { id: data.recipientId, churchId } });
    if (!recipient) throw new NotFoundException('Recipient not found');
    return this.prisma.inAppMessage.create({
      data: {
        churchId,
        senderId,
        recipientId: data.recipientId,
        subject: data.subject,
        body: data.body.trim(),
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        recipient: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async markInAppRead(churchId: string, id: string, userId: string) {
    const msg = await this.prisma.inAppMessage.findFirst({
      where: { id, churchId, recipientId: userId },
    });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.inAppMessage.update({ where: { id }, data: { readAt: new Date() } });
  }

  async getPastorReportsInbox(churchId: string, userId: string) {
    const [
      deptReports,
      weeklyReports,
      cellAttendance,
      unitAttendance,
      sundayMeetingAttendance,
      meetingSummaries,
      rtpRequests,
      queueItems,
      notifications,
      inApp,
      outreachContacts,
      serviceUnits,
    ] =
      await Promise.all([
        this.prisma.deptModuleReport.findMany({
          where: { churchId },
          orderBy: { submittedAt: 'desc' },
          take: 120,
          include: {
            author: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
            serviceUnit: { select: { id: true, name: true, departmentCode: true } },
          },
        }),
        this.prisma.serviceUnitWeeklyReport.findMany({
          where: { churchId },
          orderBy: { createdAt: 'desc' },
          take: 120,
          include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        }),
        this.listCellAttendanceReports(churchId),
        this.listServiceUnitAttendanceReports(churchId),
        this.listSundayMeetingAttendance(churchId),
        this.listMeetingSummaries(churchId),
        this.listRtpRequests(churchId),
        this.prisma.communicationQueueItem.findMany({
          where: {
            churchId,
            kind: { in: ['DEPARTMENT_WEEKLY_REPORT', 'PASTORAL_ALERT', 'DIRECT_ALERT'] },
            OR: [{ targetUserId: null }, { targetUserId: userId }],
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        }),
        this.prisma.notification.findMany({
          where: { churchId, OR: [{ userId: null }, { userId }] },
          orderBy: { sentAt: 'desc' },
          take: 200,
        }),
        this.prisma.inAppMessage.findMany({
          where: { churchId, OR: [{ recipientId: userId }, { senderId: userId }] },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
            recipient: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.listOutreachContactsForInbox(churchId),
        this.listServiceUnitsForInbox(churchId),
      ]);

    const replyTargets = this.buildReplyTargets(deptReports, inApp, queueItems);

    return {
      reports: {
        department: deptReports,
        weekly: weeklyReports,
        cellAttendance,
        unitAttendance,
        sundayMeetingAttendance,
        meetingSummaries,
        rtpRequests,
        outreach: outreachContacts,
        serviceUnits,
      },
      queue: queueItems,
      notifications,
      messages: inApp,
      replyTargets,
    };
  }

  /** Church-wide inbox for ADMIN — all reports, queue items, notifications, and in-app messages. */
  async getAdminReportsInbox(churchId: string) {
    const [
      deptReports,
      weeklyReports,
      cellAttendance,
      unitAttendance,
      sundayMeetingAttendance,
      meetingSummaries,
      rtpRequests,
      queueItems,
      notifications,
      inApp,
      staffUsers,
      outreachContacts,
      serviceUnits,
    ] = await Promise.all([
        this.prisma.deptModuleReport.findMany({
          where: { churchId },
          orderBy: { submittedAt: 'desc' },
          take: 200,
          include: {
            author: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
            serviceUnit: { select: { id: true, name: true, departmentCode: true } },
          },
        }),
        this.prisma.serviceUnitWeeklyReport.findMany({
          where: { churchId },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        }),
        this.listCellAttendanceReports(churchId),
        this.listServiceUnitAttendanceReports(churchId),
        this.listSundayMeetingAttendance(churchId),
        this.listMeetingSummaries(churchId),
        this.listRtpRequests(churchId),
        this.prisma.communicationQueueItem.findMany({
          where: { churchId },
          orderBy: { createdAt: 'desc' },
          take: 300,
          include: { serviceUnit: { select: { id: true, name: true, departmentCode: true } } },
        }),
        this.prisma.notification.findMany({
          where: { churchId },
          orderBy: { sentAt: 'desc' },
          take: 300,
        }),
        this.prisma.inAppMessage.findMany({
          where: { churchId },
          orderBy: { createdAt: 'desc' },
          take: 300,
          include: {
            sender: { select: { id: true, firstName: true, lastName: true } },
            recipient: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        this.prisma.user.findMany({
          where: {
            churchId,
            isActive: true,
            roles: { some: { role: { name: { in: ['PASTOR', 'ADMIN', 'LEADER'] } } } },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            roles: { include: { role: { select: { name: true } } } },
          },
        }),
        this.listOutreachContactsForInbox(churchId),
        this.listServiceUnitsForInbox(churchId),
      ]);

    const replyTargets = this.buildReplyTargets(
      deptReports,
      inApp,
      queueItems,
      staffUsers.map((u) => ({
        id: u.id,
        label: `${u.firstName} ${u.lastName}`.trim(),
        source: u.roles.map((r) => r.role.name).join(', ') || 'Staff',
      })),
    );

    return {
      reports: {
        department: deptReports,
        weekly: weeklyReports,
        cellAttendance,
        unitAttendance,
        sundayMeetingAttendance,
        meetingSummaries,
        rtpRequests,
        outreach: outreachContacts,
        serviceUnits,
      },
      queue: queueItems,
      notifications,
      messages: inApp,
      replyTargets,
    };
  }

  /** Sunday meeting headcounts: Ushering + Protocol/Youth/Teens/Children (for Weekly reports + Analytics). */
  private static readonly SUNDAY_MEETING_CODES: DepartmentCode[] = [
    DepartmentCode.USHERING,
    DepartmentCode.PROTOCOL,
    DepartmentCode.YOUTH,
    DepartmentCode.TEENS,
    DepartmentCode.CHILDREN,
  ];

  private async listSundayMeetingAttendance(churchId: string) {
    const codes = CommunicationsService.SUNDAY_MEETING_CODES;
    const [ushering, unitRows, childrenWeekly] = await Promise.all([
      this.prisma.usheringWeeklyHeadcount.findMany({
        where: { churchId },
        orderBy: { weekStart: 'desc' },
        take: 120,
        include: {
          serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        },
      }),
      this.prisma.serviceUnitAttendance.findMany({
        where: {
          churchId,
          serviceUnit: { departmentCode: { in: codes } },
        },
        orderBy: [{ meetingDate: 'desc' }, { weekStart: 'desc' }, { createdAt: 'desc' }],
        take: 200,
        include: {
          serviceUnit: { select: { id: true, name: true, departmentCode: true } },
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.serviceUnitWeeklyReport.findMany({
        where: {
          churchId,
          serviceUnit: { departmentCode: 'CHILDREN' },
        },
        orderBy: { weekStart: 'desc' },
        take: 80,
        include: {
          serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        },
      }),
    ]);

    type Row = {
      id: string;
      source: 'ushering' | 'unit_attendance' | 'children_weekly';
      serviceUnitId: string;
      serviceUnitName: string;
      departmentCode: string | null;
      meetingDate: string;
      weekStart: string;
      createdAt: string;
      presentCount: number;
      maleCount: number;
      femaleCount: number;
      boysCount: number;
      girlsCount: number;
      babiesCount: number;
      childrenCount: number;
      testifiersCount: number;
      firstTimersCount: number;
      recordedBy: { id: string; firstName: string; lastName: string } | null;
    };

    const rows: Row[] = [];
    const seen = new Set<string>();
    const weekKey = (unitId: string, weekIso: string) => `${unitId}|${weekIso.slice(0, 10)}`;

    for (const row of ushering) {
      const meetingDate = row.weekStart;
      const key = weekKey(row.serviceUnitId, meetingDate.toISOString());
      seen.add(key);
      rows.push({
        id: row.id,
        source: 'ushering',
        serviceUnitId: row.serviceUnitId,
        serviceUnitName: row.serviceUnit.name,
        departmentCode: row.serviceUnit.departmentCode ?? 'USHERING',
        meetingDate: meetingDate.toISOString(),
        weekStart: row.weekStart.toISOString(),
        createdAt: row.createdAt.toISOString(),
        presentCount: row.totalAttendees,
        maleCount: row.male,
        femaleCount: row.female,
        boysCount: row.babies,
        girlsCount: row.children,
        babiesCount: row.babies,
        childrenCount: row.children,
        testifiersCount: 0,
        firstTimersCount: 0,
        recordedBy: null,
      });
    }

    for (const row of unitRows) {
      const meetingDate = row.meetingDate ?? row.weekStart;
      const key = weekKey(row.serviceUnitId, meetingDate.toISOString());
      if (seen.has(key)) continue;
      seen.add(key);
      const demoTotal = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      rows.push({
        id: row.id,
        source: 'unit_attendance',
        serviceUnitId: row.serviceUnitId,
        serviceUnitName: row.serviceUnit.name,
        departmentCode: row.serviceUnit.departmentCode,
        meetingDate: meetingDate.toISOString(),
        weekStart: row.weekStart.toISOString(),
        createdAt: row.createdAt.toISOString(),
        presentCount: demoTotal > 0 ? demoTotal : row.presentCount,
        maleCount: row.maleCount,
        femaleCount: row.femaleCount,
        boysCount: row.boysCount,
        girlsCount: row.girlsCount,
        babiesCount: 0,
        childrenCount: 0,
        testifiersCount: row.testifiersCount,
        firstTimersCount: row.firstTimersCount,
        recordedBy: row.recordedBy
          ? {
              id: row.recordedBy.id,
              firstName: row.recordedBy.firstName,
              lastName: row.recordedBy.lastName,
            }
          : null,
      });
    }

    for (const row of childrenWeekly) {
      const stats =
        row.stats && typeof row.stats === 'object' && !Array.isArray(row.stats)
          ? (row.stats as Record<string, unknown>)
          : {};
      if (stats.reportType !== 'head_count') continue;
      const key = weekKey(row.serviceUnitId, row.weekStart.toISOString());
      if (seen.has(key)) continue;
      seen.add(key);
      const grand =
        stats.grandTotals && typeof stats.grandTotals === 'object' && !Array.isArray(stats.grandTotals)
          ? (stats.grandTotals as Record<string, unknown>)
          : {};
      const boys = typeof grand.boys === 'number' ? grand.boys : 0;
      const girls = typeof grand.girls === 'number' ? grand.girls : 0;
      const total = typeof grand.total === 'number' ? grand.total : boys + girls;
      rows.push({
        id: row.id,
        source: 'children_weekly',
        serviceUnitId: row.serviceUnitId,
        serviceUnitName: row.serviceUnit.name,
        departmentCode: row.serviceUnit.departmentCode ?? 'CHILDREN',
        meetingDate: row.weekStart.toISOString(),
        weekStart: row.weekStart.toISOString(),
        createdAt: row.createdAt.toISOString(),
        presentCount: total,
        maleCount: 0,
        femaleCount: 0,
        boysCount: boys,
        girlsCount: girls,
        babiesCount: 0,
        childrenCount: boys + girls,
        testifiersCount: 0,
        firstTimersCount: 0,
        recordedBy: null,
      });
    }

    return rows.sort(
      (a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime(),
    );
  }

  private async listOutreachContactsForInbox(churchId: string) {
    const rows = await this.prisma.outreachContact.findMany({
      where: { churchId },
      orderBy: { capturedAt: 'desc' },
      take: 150,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        convertStage: true,
        capturedAt: true,
        locationLabel: true,
        needsBusPickup: true,
        evangelist: { select: { firstName: true, lastName: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      email: r.email,
      convertStage: r.convertStage,
      capturedAt: r.capturedAt.toISOString(),
      locationLabel: r.locationLabel,
      needsBusPickup: r.needsBusPickup,
      evangelist: r.evangelist
        ? `${r.evangelist.firstName} ${r.evangelist.lastName}`.trim()
        : null,
    }));
  }

  private async listServiceUnitsForInbox(churchId: string) {
    return this.prisma.serviceUnit.findMany({
      where: { churchId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, departmentCode: true },
    });
  }

  /** Ministry/Cells weekly attendance for pastor & admin report dashboards. */
  private async listCellAttendanceReports(churchId: string) {
    const rows = await this.prisma.cellAttendance.findMany({
      where: { churchId },
      orderBy: [{ meetingDate: 'desc' }, { weekStart: 'desc' }, { createdAt: 'desc' }],
      take: 120,
      include: {
        branch: { select: { id: true, name: true, location: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return rows.map((row) => {
      const meetingDate = row.meetingDate ?? row.weekStart;
      const demoTotal = row.maleCount + row.femaleCount + row.boysCount + row.girlsCount;
      return {
        id: row.id,
        branchId: row.branchId,
        branchName: row.branch.name,
        location: row.branch.location,
        meetingDate: meetingDate.toISOString(),
        weekStart: row.weekStart.toISOString(),
        createdAt: row.createdAt.toISOString(),
        presentCount: demoTotal > 0 ? demoTotal : row.presentCount,
        maleCount: row.maleCount,
        femaleCount: row.femaleCount,
        boysCount: row.boysCount,
        girlsCount: row.girlsCount,
        testifiersCount: row.testifiersCount,
        firstTimersCount: row.firstTimersCount,
        recordedBy: row.recordedBy
          ? {
              id: row.recordedBy.id,
              firstName: row.recordedBy.firstName,
              lastName: row.recordedBy.lastName,
            }
          : null,
      };
    });
  }

  /** Service unit demographic attendance for pastor & admin report dashboards. */
  private async listServiceUnitAttendanceReports(churchId: string) {
    const rows = await this.prisma.serviceUnitAttendance.findMany({
      where: { churchId },
      orderBy: [{ meetingDate: 'desc' }, { weekStart: 'desc' }, { createdAt: 'desc' }],
      take: 120,
      include: {
        serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return rows.map((row) => {
      const meetingDate = row.meetingDate ?? row.weekStart;
      const adultTotal = row.maleCount + row.femaleCount;
      return {
        id: row.id,
        serviceUnitId: row.serviceUnitId,
        serviceUnitName: row.serviceUnit.name,
        departmentCode: row.serviceUnit.departmentCode,
        meetingDate: meetingDate.toISOString(),
        weekStart: row.weekStart.toISOString(),
        createdAt: row.createdAt.toISOString(),
        presentCount: adultTotal > 0 ? adultTotal : row.presentCount,
        maleCount: row.maleCount,
        femaleCount: row.femaleCount,
        boysCount: row.boysCount,
        girlsCount: row.girlsCount,
        testifiersCount: row.testifiersCount,
        firstTimersCount: row.firstTimersCount,
        recordedBy: row.recordedBy
          ? {
              id: row.recordedBy.id,
              firstName: row.recordedBy.firstName,
              lastName: row.recordedBy.lastName,
            }
          : null,
      };
    });
  }

  /** Service unit meeting summaries for pastor & admin report dashboards. */
  private async listMeetingSummaries(churchId: string) {
    const rows = await this.prisma.serviceUnitMeetingSummary.findMany({
      where: { churchId },
      orderBy: [{ meetingDate: 'desc' }, { createdAt: 'desc' }],
      take: 120,
      include: {
        serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        author: { select: { id: true, firstName: true, lastName: true, userId: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      meetingDate: row.meetingDate?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      serviceUnit: row.serviceUnit,
      author: {
        id: row.author.id,
        userId: row.author.userId,
        firstName: row.author.firstName,
        lastName: row.author.lastName,
      },
    }));
  }

  private async listRtpRequests(churchId: string) {
    const rows = await this.prisma.rtpRequest.findMany({
      where: { churchId },
      orderBy: { createdAt: 'desc' },
      take: 120,
      include: {
        serviceUnit: { select: { id: true, name: true, departmentCode: true } },
        submittedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        receivedBy: { select: { id: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      fieldValues:
        row.fieldValues && typeof row.fieldValues === 'object' && !Array.isArray(row.fieldValues)
          ? (row.fieldValues as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
      receivedAt: row.receivedAt?.toISOString() ?? null,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      rejectionReason: row.rejectionReason,
      serviceUnit: row.serviceUnit,
      submittedBy: row.submittedBy,
      receivedBy: row.receivedBy,
      approvedBy: row.approvedBy,
    }));
  }

  private buildReplyTargets(
    deptReports: Array<{
      title: string;
      author: { userId: string | null; firstName: string; lastName: string };
      serviceUnit: { name: string };
    }>,
    inApp: Array<{
      sender: { id: string; firstName: string; lastName: string };
      recipient: { id: string; firstName: string; lastName: string };
    }>,
    queueItems: Array<{ title: string; targetUserId: string | null }>,
    staffUsers?: Array<{ id: string; label: string; source: string }>,
  ) {
    const map = new Map<string, { userId: string; label: string; source: string }>();
    const add = (userId: string | null | undefined, label: string, source: string) => {
      if (!userId) return;
      if (!map.has(userId)) map.set(userId, { userId, label, source });
    };

    for (const r of deptReports) {
      const label = `${r.author.firstName} ${r.author.lastName}`.trim();
      add(r.author.userId, label, `${r.serviceUnit.name} · ${r.title}`);
    }
    for (const m of inApp) {
      const senderLabel = `${m.sender.firstName} ${m.sender.lastName}`.trim();
      const recipientLabel = `${m.recipient.firstName} ${m.recipient.lastName}`.trim();
      add(m.sender.id, senderLabel, 'In-app message');
      add(m.recipient.id, recipientLabel, 'In-app message');
    }
    for (const q of queueItems) {
      add(q.targetUserId, 'Queue recipient', q.title);
    }
    for (const s of staffUsers ?? []) {
      add(s.id, s.label, s.source);
    }

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  async replyToPastorInbox(
    churchId: string,
    senderId: string,
    payload: { recipientId: string; subject?: string; body: string },
  ) {
    return this.sendInAppMessage(churchId, senderId, payload);
  }

  async replyToAdminInbox(
    churchId: string,
    senderId: string,
    payload: { recipientId: string; subject?: string; body: string },
  ) {
    return this.sendInAppMessage(churchId, senderId, payload);
  }

  // ─── Group chat channels ───────────────────────────────────

  listChannels(churchId: string, filters?: { channelType?: ChatChannelType; includeArchived?: boolean }) {
    return this.prisma.chatChannel.findMany({
      where: {
        churchId,
        ...(filters?.channelType ? { channelType: filters.channelType } : {}),
        ...(filters?.includeArchived ? {} : { isArchived: false }),
      },
      include: {
        youthGroup: { select: { name: true } },
        serviceUnit: { select: { name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  createChannel(
    churchId: string,
    data: {
      name: string;
      description?: string;
      channelType?: ChatChannelType;
      youthGroupId?: string;
      serviceUnitId?: string;
      isModerated?: boolean;
    },
  ) {
    return this.prisma.chatChannel.create({
      data: {
        churchId,
        name: data.name,
        description: data.description,
        channelType: data.channelType ?? 'CHURCH',
        youthGroupId: data.youthGroupId,
        serviceUnitId: data.serviceUnitId,
        isModerated: data.isModerated ?? true,
      },
    });
  }

  async listChannelMessages(churchId: string, channelId: string, includeHidden = false) {
    const channel = await this.prisma.chatChannel.findFirst({ where: { id: channelId, churchId } });
    if (!channel) throw new NotFoundException('Channel not found');
    return this.prisma.message.findMany({
      where: { channelId, ...(includeHidden ? {} : { isHidden: false }) },
      include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
  }

  private scanContent(content: string) {
    const lower = content.toLowerCase();
    const hit = MODERATION_KEYWORDS.find((k) => lower.includes(k));
    return hit ? `Flagged keyword: ${hit}` : null;
  }

  async postChannelMessage(churchId: string, channelId: string, senderId: string, content: string) {
    const channel = await this.prisma.chatChannel.findFirst({ where: { id: channelId, churchId } });
    if (!channel) throw new NotFoundException('Channel not found');
    const flagReason = channel.isModerated ? this.scanContent(content) : null;
    return this.prisma.message.create({
      data: {
        channelId,
        senderId,
        content,
        isFlagged: !!flagReason,
        flagReason: flagReason ?? undefined,
        isHidden: !!flagReason,
      },
      include: { sender: { select: { firstName: true, lastName: true } } },
    });
  }

  listFlaggedMessages(churchId: string) {
    return this.prisma.message.findMany({
      where: {
        channel: { churchId },
        OR: [{ isFlagged: true }, { isHidden: true }],
      },
      include: {
        sender: { select: { firstName: true, lastName: true } },
        channel: { select: { name: true, channelType: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async moderateMessage(
    churchId: string,
    messageId: string,
    moderatorId: string,
    data: { isHidden: boolean; flagReason?: string },
  ) {
    const msg = await this.prisma.message.findFirst({
      where: { id: messageId, channel: { churchId } },
    });
    if (!msg) throw new NotFoundException('Message not found');
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        isHidden: data.isHidden,
        flagReason: data.flagReason,
        moderatedById: moderatorId,
        moderatedAt: new Date(),
      },
    });
  }

  getCatalog() {
    return { announcementCategories: ANNOUNCEMENT_CATEGORIES };
  }
}
