import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { PastoralCareService } from '../pastoral-care/pastoral-care.service';
import { resolveDeptModuleCode } from '../../../prisma/dept-module-catalog';
import {
  generatePrayerPoints,
  parseWeekStartInput,
  PRAYER_BURDEN_TYPES,
  PRAYER_CONFIDENTIALITY,
  PRAYER_INTAKE_CATEGORIES,
  PRAYER_SCHEDULE_TYPES,
} from './prayer.constants';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  userId: true,
} as const;

@Injectable()
export class PrayerDepartmentService {
  private readonly logger = new Logger(PrayerDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly pastoral: PastoralCareService,
  ) {}

  getCatalog() {
    return {
      burdenTypes: PRAYER_BURDEN_TYPES,
      confidentiality: PRAYER_CONFIDENTIALITY,
      intakeCategories: PRAYER_INTAKE_CATEGORIES,
      scheduleTypes: PRAYER_SCHEDULE_TYPES,
    };
  }

  private async requirePrayerUnit(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.access.requireView(userId, churchId, serviceUnitId);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
    if (code !== 'PRAYER') {
      throw new BadRequestException('Prayer Squad tools are only available for the Prayer department');
    }
    return { ctx, unit };
  }

  private prismaHint(err: unknown): never {
    const code = (err as { code?: string })?.code;
    if (code === 'P2021' || code === 'P2010') {
      throw new BadRequestException(
        'Prayer Squad tables are missing. Run: npx prisma migrate deploy (from apps/api), then restart the API.',
      );
    }
    throw err;
  }

  async listAssignments(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    query?: { weekStart?: string },
  ) {
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    const week = query?.weekStart ? parseWeekStartInput(query.weekStart) : parseWeekStartInput();
    try {
      const rows = await this.prisma.deptPrayerAssignment.findMany({
        where: { serviceUnitId, weekStart: week },
        include: {
          assignedMember: { select: memberSelect },
          relatedMember: { select: memberSelect },
        },
        orderBy: { createdAt: 'asc' },
      });
      return {
        weekKey: week.toISOString().slice(0, 10),
        assignments: rows,
        byBurden: PRAYER_BURDEN_TYPES.map((b) => ({
          ...b,
          items: rows.filter((r) => r.burdenType === b.value),
        })),
      };
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async upsertAssignment(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      weekStart: string;
      burdenType: string;
      confidentiality: string;
      title: string;
      content: string;
      relatedMemberId?: string;
      assignedMemberId?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    const weekStart = parseWeekStartInput(body.weekStart);
    const data = {
      weekStart,
      burdenType: body.burdenType as never,
      confidentiality: body.confidentiality as never,
      title: body.title.trim(),
      content: body.content.trim(),
      relatedMemberId: body.relatedMemberId,
      assignedMemberId: body.assignedMemberId,
    };
    try {
      if (body.id) {
        return await this.prisma.deptPrayerAssignment.update({
          where: { id: body.id },
          data,
          include: {
            assignedMember: { select: memberSelect },
            relatedMember: { select: memberSelect },
          },
        });
      }
      return await this.prisma.deptPrayerAssignment.create({
        data: { churchId, serviceUnitId, ...data },
        include: {
          assignedMember: { select: memberSelect },
          relatedMember: { select: memberSelect },
        },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async deleteAssignment(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptPrayerAssignment.findFirst({ where: { id, serviceUnitId } });
    if (!row) throw new NotFoundException('Assignment not found');
    await this.prisma.deptPrayerAssignment.delete({ where: { id } });
    return { ok: true };
  }

  async listSchedule(userId: string, churchId: string, serviceUnitId: string) {
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    try {
      const sessions = await this.prisma.deptPrayerScheduleSession.findMany({
        where: { serviceUnitId },
        include: {
          attendance: { include: { member: { select: memberSelect } } },
        },
        orderBy: { startsAt: 'asc' },
      });
      return {
        sessions,
        byType: PRAYER_SCHEDULE_TYPES.map((t) => ({
          ...t,
          sessions: sessions.filter((s) => s.eventType === t.value),
        })),
      };
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async upsertSchedule(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      eventType: string;
      title?: string;
      startsAt: string;
      endsAt?: string;
      notes?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    const startsAt = new Date(body.startsAt);
    const data = {
      eventType: body.eventType as never,
      title: body.title,
      startsAt,
      endsAt: body.endsAt ? new Date(body.endsAt) : null,
      notes: body.notes,
    };
    try {
      if (body.id) {
        return await this.prisma.deptPrayerScheduleSession.update({
          where: { id: body.id },
          data,
          include: { attendance: { include: { member: { select: memberSelect } } } },
        });
      }
      return await this.prisma.deptPrayerScheduleSession.create({
        data: { churchId, serviceUnitId, ...data },
        include: { attendance: { include: { member: { select: memberSelect } } } },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async deleteSchedule(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptPrayerScheduleSession.findFirst({ where: { id, serviceUnitId } });
    if (!row) throw new NotFoundException('Session not found');
    await this.prisma.deptPrayerScheduleSession.delete({ where: { id } });
    return { ok: true };
  }

  async bulkScheduleAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: { sessionId: string; memberIds: string[]; attended?: boolean },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    if (!body.memberIds?.length) throw new BadRequestException('Select at least one member');
    const session = await this.prisma.deptPrayerScheduleSession.findFirst({
      where: { id: body.sessionId, serviceUnitId },
    });
    if (!session) throw new NotFoundException('Session not found');
    const records = [];
    for (const memberId of body.memberIds) {
      records.push(
        await this.prisma.deptPrayerScheduleAttendance.upsert({
          where: { sessionId_memberId: { sessionId: body.sessionId, memberId } },
          create: {
            sessionId: body.sessionId,
            memberId,
            attended: body.attended ?? true,
          },
          update: { attended: body.attended ?? true },
          include: { member: { select: memberSelect } },
        }),
      );
    }
    return { saved: records.length, records };
  }

  async listIntake(userId: string, churchId: string, serviceUnitId: string) {
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    try {
      return await this.prisma.deptPrayerItem.findMany({
        where: { serviceUnitId, intakeCategory: { not: null } },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedMember: { select: memberSelect },
          submittedByMember: { select: memberSelect },
          relatedMember: { select: memberSelect },
          progressNotes: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { author: { select: memberSelect } },
          },
        },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async createIntake(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      content: string;
      intakeCategory: string;
      confidentiality?: string;
      requesterName?: string;
      isAnonymous?: boolean;
      relatedMemberId?: string;
      assignedMemberId?: string;
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    try {
      return await this.prisma.deptPrayerItem.create({
        data: {
          churchId,
          serviceUnitId,
          content: body.content.trim(),
          intakeCategory: body.intakeCategory as never,
          confidentiality: (body.confidentiality ?? 'LEADERS_ONLY') as never,
          requesterName: body.isAnonymous ? null : body.requesterName,
          isAnonymous: body.isAnonymous ?? false,
          relatedMemberId: body.relatedMemberId,
          assignedMemberId: body.assignedMemberId,
          submittedByMemberId: ctx.memberId ?? undefined,
          status: body.assignedMemberId ? 'ASSIGNED' : 'NEW',
        },
        include: {
          assignedMember: { select: memberSelect },
          submittedByMember: { select: memberSelect },
        },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async updateIntake(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    id: string,
    body: {
      status?: string;
      assignedMemberId?: string;
      isAnswered?: boolean;
      answeredNote?: string;
      intakeCategory?: string;
      confidentiality?: string;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    try {
      return await this.prisma.deptPrayerItem.update({
        where: { id },
        data: {
          status: body.status as never,
          assignedMemberId: body.assignedMemberId,
          isAnswered: body.isAnswered,
          answeredNote: body.answeredNote,
          answeredAt: body.isAnswered ? new Date() : undefined,
          intakeCategory: body.intakeCategory as never,
          confidentiality: body.confidentiality as never,
        },
        include: { assignedMember: { select: memberSelect } },
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async deleteIntake(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.prisma.deptPrayerItem.delete({ where: { id } });
    return { ok: true };
  }

  async escalateIntake(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const item = await this.prisma.deptPrayerItem.findFirst({ where: { id, serviceUnitId } });
    if (!item) throw new NotFoundException('Request not found');
    if (item.escalatedToPastorAt) return item;

    const cat =
      PRAYER_INTAKE_CATEGORIES.find((c) => c.value === item.intakeCategory)?.label ??
      item.intakeCategory ??
      'Prayer request';

    await this.pastoral.createCase(churchId, {
      title: `Prayer Squad — ${cat} (escalated)`,
      category: 'COUNSELING',
      summary: item.content,
      isConfidential: true,
    });

    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    const alertBody = [
      'Prayer Squad request escalated to pastoral care.',
      `Category: ${cat}`,
      item.content.slice(0, 500),
    ].join('\n');

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: 'Prayer Squad — pastoral escalation',
        body: alertBody,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: staff.id,
        metadata: { prayerItemId: item.id },
      });
    }

    return this.prisma.deptPrayerItem.update({
      where: { id },
      data: { escalatedToPastorAt: new Date(), status: 'IN_PROGRESS' },
      include: { assignedMember: { select: memberSelect } },
    });
  }

  async listProgress(userId: string, churchId: string, serviceUnitId: string) {
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    try {
      const [items, notes] = await Promise.all([
        this.prisma.deptPrayerItem.findMany({
          where: { serviceUnitId },
          orderBy: { updatedAt: 'desc' },
          include: { assignedMember: { select: memberSelect } },
        }),
        this.prisma.deptPrayerProgressNote.findMany({
          where: { serviceUnitId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            author: { select: memberSelect },
            prayerItem: { select: { id: true, content: true } },
          },
        }),
      ]);
      return { items, notes };
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async addProgressNote(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      prayerItemId?: string;
      assignmentId?: string;
      body: string;
      statusAfter?: string;
    },
  ) {
    const { ctx } = await this.access.requireLead(userId, churchId, serviceUnitId);
    const authorId = await this.access.resolveAuthorMemberId(ctx);
    if (!body.prayerItemId && !body.assignmentId) {
      throw new BadRequestException('prayerItemId or assignmentId required');
    }
    try {
      const note = await this.prisma.deptPrayerProgressNote.create({
        data: {
          churchId,
          serviceUnitId,
          prayerItemId: body.prayerItemId,
          assignmentId: body.assignmentId,
          authorId,
          body: body.body.trim(),
          statusAfter: body.statusAfter as never,
        },
        include: { author: { select: memberSelect } },
      });
      if (body.prayerItemId && body.statusAfter) {
        await this.prisma.deptPrayerItem.update({
          where: { id: body.prayerItemId },
          data: {
            status: body.statusAfter as never,
            ...(body.statusAfter === 'ANSWERED'
              ? { isAnswered: true, answeredAt: new Date() }
              : {}),
          },
        });
      }
      return note;
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async listScripture(userId: string, churchId: string, serviceUnitId: string) {
    await this.requirePrayerUnit(userId, churchId, serviceUnitId);
    try {
      return await this.prisma.deptPrayerScriptureGuide.findMany({
        where: { serviceUnitId },
        orderBy: { serviceDate: 'desc' },
        take: 30,
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async upsertScripture(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      id?: string;
      serviceDate: string;
      scriptureRef: string;
      prayerPoints?: string;
      devotionTieIn?: string;
      autoGenerate?: boolean;
    },
  ) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    const serviceDate = new Date(body.serviceDate);
    const prayerPoints =
      body.prayerPoints?.trim() ||
      (body.autoGenerate !== false
        ? generatePrayerPoints(body.scriptureRef, body.devotionTieIn)
        : '');
    const data = {
      serviceDate,
      scriptureRef: body.scriptureRef.trim(),
      prayerPoints,
      devotionTieIn: body.devotionTieIn,
    };
    try {
      if (body.id) {
        return await this.prisma.deptPrayerScriptureGuide.update({ where: { id: body.id }, data });
      }
      return await this.prisma.deptPrayerScriptureGuide.upsert({
        where: { serviceUnitId_serviceDate: { serviceUnitId, serviceDate } },
        create: { churchId, serviceUnitId, ...data },
        update: data,
      });
    } catch (err) {
      this.prismaHint(err);
    }
  }

  async deleteScripture(userId: string, churchId: string, serviceUnitId: string, id: string) {
    await this.access.requireLead(userId, churchId, serviceUnitId);
    await this.prisma.deptPrayerScriptureGuide.delete({ where: { id } });
    return { ok: true };
  }
}
