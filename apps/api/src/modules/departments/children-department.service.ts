import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { PastoralCareService } from '../pastoral-care/pastoral-care.service';
import { UploadsService } from '../uploads/uploads.service';
import { resolveDeptModuleCode } from '../../../prisma/dept-module-catalog';
import {
  type ChildrenClassGroup,
  isoWeekKey,
  parseWeekStartInput,
  simplifyLessonForChildren,
} from './children.constants';
import { ChildrenClassDefinitionsService } from './children-class-definitions.service';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  userId: true,
} as const;

@Injectable()
export class ChildrenDepartmentService {
  private readonly logger = new Logger(ChildrenDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly pastoral: PastoralCareService,
    private readonly uploads: UploadsService,
    private readonly classDefinitions: ChildrenClassDefinitionsService,
  ) {}

  async getCatalog(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const classGroups = await this.classDefinitions.listActive(churchId, serviceUnitId);
    return { classGroups };
  }

  private async requireChildrenUnit(userId: string, churchId: string, serviceUnitId: string) {
    return this.access.requireChildrenMinistryLeadership(userId, churchId, serviceUnitId);
  }

  private parseWeekStart(weekStart?: string): Date {
    try {
      return parseWeekStartInput(weekStart);
    } catch {
      throw new BadRequestException('Invalid weekStart date');
    }
  }

  private prismaTableHint(err: unknown): never {
    const code = (err as { code?: string })?.code;
    if (code === 'P2021' || code === 'P2010') {
      throw new BadRequestException(
        "Children's ministry tables are missing. Run: npx prisma migrate deploy (from apps/api), then restart the API.",
      );
    }
    throw err;
  }

  async listRoster(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    weekStart?: string,
  ) {
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const ws = this.parseWeekStart(weekStart);
    const classGroups = await this.classDefinitions.listActive(churchId, serviceUnitId);
    const rows = await this.prisma.deptChildrenDutyRoster.findMany({
      where: { churchId, serviceUnitId, weekStart: ws },
      include: {
        teacher: { select: memberSelect },
        assistant: { select: memberSelect },
      },
      orderBy: { classGroup: 'asc' },
    });
    return {
      weekStart: ws.toISOString(),
      weekKey: isoWeekKey(ws),
      classGroups,
      assignments: rows,
      distribution: classGroups.map((g) => ({
        classGroup: g.code,
        label: g.name,
        assigned: rows.some((r: { classGroup: string }) => r.classGroup === g.code),
      })),
    };
  }

  async upsertRoster(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      weekStart?: string;
      classGroup: string;
      teacherMemberId: string;
      assistantMemberId?: string | null;
      notes?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, body.classGroup);
    const ws = this.parseWeekStart(body.weekStart);

    for (const id of [body.teacherMemberId, body.assistantMemberId].filter(Boolean) as string[]) {
      const m = await this.prisma.member.findFirst({ where: { id, churchId } });
      if (!m) throw new BadRequestException('Teacher or assistant member not found');
    }

    try {
      return await this.prisma.deptChildrenDutyRoster.upsert({
        where: {
          serviceUnitId_weekStart_classGroup: {
            serviceUnitId,
            weekStart: ws,
            classGroup: body.classGroup,
          },
        },
        create: {
          churchId,
          serviceUnitId,
          weekStart: ws,
          classGroup: body.classGroup,
          teacherMemberId: body.teacherMemberId,
          assistantMemberId: body.assistantMemberId ?? null,
          notes: body.notes,
        },
        update: {
          teacherMemberId: body.teacherMemberId,
          assistantMemberId: body.assistantMemberId ?? null,
          notes: body.notes,
          reminderSentAt: null,
        },
        include: {
          teacher: { select: memberSelect },
          assistant: { select: memberSelect },
        },
      });
    } catch (err) {
      this.prismaTableHint(err);
    }
  }

  async deleteRoster(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    rosterId: string,
  ) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    const row = await this.prisma.deptChildrenDutyRoster.findFirst({
      where: { id: rosterId, churchId, serviceUnitId },
    });
    if (!row) throw new NotFoundException('Roster assignment not found');
    await this.prisma.deptChildrenDutyRoster.delete({ where: { id: rosterId } });
    return { ok: true };
  }

  async sendRosterReminders(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body?: { weekStart?: string; force?: boolean },
  ) {
    await this.access.requireManage(userId, churchId, serviceUnitId);
    const { unit } = await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const ws = this.parseWeekStart(body?.weekStart);
    const weekLabel = isoWeekKey(ws);

    const rows = await this.prisma.deptChildrenDutyRoster.findMany({
      where: {
        churchId,
        serviceUnitId,
        weekStart: ws,
        ...(body?.force ? {} : { reminderSentAt: null }),
      },
      include: {
        teacher: { select: memberSelect },
        assistant: { select: memberSelect },
      },
    });

    let sent = 0;
    for (const row of rows) {
      const targets = [row.teacher, row.assistant].filter(Boolean) as Array<{
        id: string;
        firstName: string;
        lastName: string;
        userId: string | null;
      }>;
      const groupLabel =
        (await this.classDefinitions.resolveLabel(churchId, serviceUnitId, row.classGroup)) ??
        row.classGroup;
      const msg = [
        `Children's ministry teaching duty — week of ${weekLabel}`,
        `Class: ${groupLabel}`,
        `Role: {{role}}`,
        unit.name ? `Unit: ${unit.name}` : '',
        'Please confirm your availability in the department app.',
      ]
        .filter(Boolean)
        .join('\n');

      for (const member of targets) {
        if (!member.userId) continue;
        const role = member.id === row.teacherMemberId ? 'Lead teacher' : 'Assistant';
        await this.commQueue.enqueue(churchId, {
          kind: 'DIRECT_ALERT',
          title: "Children's ministry — teaching duty",
          body: msg.replace('{{role}}', role),
          channels: ['IN_APP', 'EMAIL'],
          serviceUnitId,
          targetUserId: member.userId,
          targetMemberId: member.id,
          metadata: { rosterId: row.id, classGroup: row.classGroup, weekKey: weekLabel },
        });
        await this.prisma.notification.create({
          data: {
            churchId,
            userId: member.userId,
            type: 'DEPT_REMINDER',
            title: "Children's ministry — teaching duty",
            body: msg.replace('{{role}}', role),
            data: {
              rosterId: row.id,
              serviceUnitId,
              classGroup: row.classGroup,
            } as Prisma.InputJsonValue,
          },
        });
        sent += 1;
      }

      await this.prisma.deptChildrenDutyRoster.update({
        where: { id: row.id },
        data: { reminderSentAt: new Date() },
      });
    }

    return { weekStart: ws.toISOString(), remindersQueued: sent, rosterCount: rows.length };
  }

  async listCurriculum(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    query?: { weekStart?: string; source?: string },
  ) {
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const ws = query?.weekStart ? this.parseWeekStart(query.weekStart) : undefined;
    return this.prisma.deptChildrenCurriculum.findMany({
      where: {
        churchId,
        serviceUnitId,
        ...(ws ? { weekStart: ws } : {}),
        ...(query?.source ? { source: query.source as 'OFFICIAL_WEEKLY' | 'CUSTOM_UPLOAD' } : {}),
      },
      include: { author: { select: memberSelect } },
      orderBy: [{ weekStart: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createCurriculum(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      title: string;
      weekStart?: string;
      fileUrl?: string;
      body?: string;
      source?: 'OFFICIAL_WEEKLY' | 'CUSTOM_UPLOAD';
      targetClassGroup?: string;
      authorMemberId?: string;
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    if (!body.title?.trim()) throw new BadRequestException('Title is required');
    if (body.targetClassGroup) {
      await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, body.targetClassGroup);
    }

    const authorId = body.authorMemberId ?? ctx.memberId ?? null;

    try {
      return await this.prisma.deptChildrenCurriculum.create({
        data: {
          churchId,
          serviceUnitId,
          title: body.title.trim(),
          weekStart: body.weekStart ? this.parseWeekStart(body.weekStart) : null,
          fileUrl: body.fileUrl,
          body: body.body,
          source: body.source ?? 'CUSTOM_UPLOAD',
          targetClassGroup: body.targetClassGroup,
          authorId,
        },
        include: { author: { select: memberSelect } },
      });
    } catch (err) {
      this.prismaTableHint(err);
    }
  }

  async uploadCurriculumPdf(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    file: Express.Multer.File,
    meta?: { title?: string; weekStart?: string; targetClassGroup?: string },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const { url } = await this.uploads.saveDeptCurriculumPdf(churchId, serviceUnitId, file);
    return this.createCurriculum(userId, churchId, serviceUnitId, {
      title: meta?.title?.trim() || file.originalname || 'Teaching material',
      weekStart: meta?.weekStart,
      fileUrl: url,
      source: 'CUSTOM_UPLOAD',
      targetClassGroup: meta?.targetClassGroup,
      authorMemberId: ctx.memberId ?? undefined,
    });
  }

  async simplifyCurriculum(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    curriculumId: string,
    body: { classGroup: string },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const item = await this.prisma.deptChildrenCurriculum.findFirst({
      where: { id: curriculumId, churchId, serviceUnitId },
    });
    if (!item) throw new NotFoundException('Curriculum item not found');
    const sourceText = item.body?.trim() || item.title;
    if (!sourceText) throw new BadRequestException('Add lesson text or title before simplifying');
    await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, body.classGroup);

    const simplified = simplifyLessonForChildren(sourceText, body.classGroup);
    return this.prisma.deptChildrenCurriculum.update({
      where: { id: curriculumId },
      data: { simplifiedLesson: simplified, targetClassGroup: body.classGroup },
      include: { author: { select: memberSelect } },
    });
  }

  async listClassReports(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    query?: { from?: string; to?: string },
  ) {
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    const where: Prisma.DeptChildrenClassReportWhereInput = { churchId, serviceUnitId };
    if (query?.from || query?.to) {
      where.serviceDate = {};
      if (query.from) where.serviceDate.gte = new Date(query.from);
      if (query.to) where.serviceDate.lte = new Date(query.to);
    }
    return this.prisma.deptChildrenClassReport.findMany({
      where,
      include: {
        teacher: { select: memberSelect },
        curriculum: { select: { id: true, title: true, weekStart: true } },
      },
      orderBy: { serviceDate: 'desc' },
      take: 100,
    });
  }

  async createClassReport(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      classGroup: string;
      serviceDate?: string;
      teacherMemberId: string;
      curriculumId?: string;
      lessonTaught: string;
      behaviorNotes?: string;
      attentionNotes?: string;
      escalatePastoralCare?: boolean;
      pastoralSummary?: string;
    },
  ) {
    await this.access.requireParticipate(userId, churchId, serviceUnitId);
    await this.requireChildrenUnit(userId, churchId, serviceUnitId);
    if (!body.lessonTaught?.trim()) throw new BadRequestException('Lesson taught is required');
    await this.classDefinitions.assertActiveClassCode(churchId, serviceUnitId, body.classGroup);

    const teacher = await this.prisma.member.findFirst({
      where: { id: body.teacherMemberId, churchId },
    });
    if (!teacher) throw new BadRequestException('Teacher member not found');

    let report;
    try {
      report = await this.prisma.deptChildrenClassReport.create({
        data: {
          churchId,
          serviceUnitId,
          classGroup: body.classGroup,
          serviceDate: body.serviceDate ? new Date(body.serviceDate) : new Date(),
          teacherMemberId: body.teacherMemberId,
          curriculumId: body.curriculumId,
          lessonTaught: body.lessonTaught.trim(),
          behaviorNotes: body.behaviorNotes,
          attentionNotes: body.attentionNotes,
          escalatePastoralCare: body.escalatePastoralCare ?? false,
        },
        include: {
          teacher: { select: memberSelect },
          curriculum: { select: { id: true, title: true } },
        },
      });
    } catch (err) {
      this.prismaTableHint(err);
    }

    if (body.escalatePastoralCare) {
      await this.escalateToPastoralCare(churchId, serviceUnitId, report, body.pastoralSummary);
      return this.prisma.deptChildrenClassReport.findUniqueOrThrow({
        where: { id: report.id },
        include: {
          teacher: { select: memberSelect },
          curriculum: { select: { id: true, title: true } },
        },
      });
    }

    return report;
  }

  private async escalateToPastoralCare(
    churchId: string,
    serviceUnitId: string,
    report: {
      id: string;
      classGroup: string;
      lessonTaught: string;
      behaviorNotes: string | null;
      attentionNotes: string | null;
    },
    pastoralSummary?: string,
  ) {
    const groupLabel =
      (await this.classDefinitions.resolveLabel(churchId, serviceUnitId, report.classGroup)) ??
      report.classGroup;
    const summary = [
      pastoralSummary,
      `Class: ${groupLabel}`,
      `Lesson: ${report.lessonTaught}`,
      report.behaviorNotes ? `Behavior: ${report.behaviorNotes}` : null,
      report.attentionNotes ? `Children needing attention: ${report.attentionNotes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await this.pastoral.createCase(churchId, {
      title: `Children's ministry — pastoral follow-up (${groupLabel})`,
      category: 'COUNSELING',
      summary,
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
      "Children's class report flagged for pastoral care.",
      groupLabel,
      report.attentionNotes ? `Attention: ${report.attentionNotes}` : '',
      'Review in Pastoral Care dashboard.',
    ]
      .filter(Boolean)
      .join('\n');

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: "Children's ministry — pastoral escalation",
        body: alertBody,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: staff.id,
        metadata: { classReportId: report.id },
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: staff.id,
          type: 'PASTORAL_ESCALATION',
          title: "Children's ministry — pastoral escalation",
          body: alertBody,
          data: { classReportId: report.id, serviceUnitId } as Prisma.InputJsonValue,
        },
      });
    }

    await this.prisma.deptChildrenClassReport.update({
      where: { id: report.id },
      data: { pastoralNotifiedAt: new Date() },
    });

    this.logger.log(`Pastoral escalation for class report ${report.id}`);
  }
}
