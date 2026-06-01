import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { MedicalIncidentCategory } from './medical.constants';

type MedicalRecoveryStatus =
  | 'NOT_APPLICABLE'
  | 'MONITORING'
  | 'IMPROVING'
  | 'STABLE'
  | 'RECOVERED'
  | 'CRITICAL';
import { PrismaService } from '../../prisma/prisma.module';
import { DepartmentAccessService } from './department-access.service';
import { CommunicationsQueueService } from '../communications/communications-queue.service';
import { ServiceUnitsDepartmentService } from '../service-units/service-units-department.service';
import {
  isSeriousIncident,
  MEDICAL_INCIDENT_CATEGORY_LABELS,
} from './medical.constants';
import { resolveDeptModuleCode } from '../../../prisma/dept-module-catalog';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  avatarUrl: true,
} as const;

@Injectable()
export class MedicalDepartmentService {
  private readonly logger = new Logger(MedicalDepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: DepartmentAccessService,
    private readonly commQueue: CommunicationsQueueService,
    private readonly deptReports: ServiceUnitsDepartmentService,
  ) {}

  getCatalog() {
    return {
      categories: Object.entries(MEDICAL_INCIDENT_CATEGORY_LABELS).map(([value, label]) => ({
        value,
        label,
      })),
      recoveryStatuses: [
        'NOT_APPLICABLE',
        'MONITORING',
        'IMPROVING',
        'STABLE',
        'RECOVERED',
        'CRITICAL',
      ],
    };
  }

  private async requireMedicalUnit(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.access.requireView(userId, churchId, serviceUnitId);
    const code = resolveDeptModuleCode(unit.departmentCode, unit.name);
    if (code !== 'MEDICAL') {
      throw new BadRequestException('Medical tools are only available for the Medical department');
    }
    return { ctx, unit };
  }

  private async resolveSubjectMember(
    churchId: string,
    subjectMemberId?: string,
    memberHint?: { firstName?: string; lastName?: string; phone?: string },
  ) {
    if (subjectMemberId) {
      const m = await this.prisma.member.findFirst({
        where: { id: subjectMemberId, churchId },
      });
      if (!m) throw new BadRequestException('Member not found for auto-link');
      return m.id;
    }
    if (memberHint?.phone) {
      const byPhone = await this.prisma.member.findFirst({
        where: { churchId, phone: memberHint.phone },
      });
      if (byPhone) return byPhone.id;
    }
    if (memberHint?.firstName) {
      const byName = await this.prisma.member.findFirst({
        where: {
          churchId,
          firstName: { equals: memberHint.firstName, mode: 'insensitive' },
          ...(memberHint.lastName
            ? { lastName: { equals: memberHint.lastName, mode: 'insensitive' } }
            : {}),
        },
      });
      if (byName) return byName.id;
    }
    return null;
  }

  private async notifyLeadership(
    churchId: string,
    serviceUnitId: string,
    incident: { id: string; title: string; category: string; subjectMemberId: string | null },
  ) {
    const staffUsers = await this.prisma.user.findMany({
      where: {
        churchId,
        isActive: true,
        roles: { some: { role: { name: { in: ['ADMIN', 'PASTOR'] } } } },
      },
      select: { id: true },
    });

    const subject = incident.subjectMemberId
      ? await this.prisma.member.findUnique({
          where: { id: incident.subjectMemberId },
          select: { firstName: true, lastName: true },
        })
      : null;
    const memberLabel = subject
      ? `${subject.firstName} ${subject.lastName}`
      : 'Unknown member';

    const body = [
      `Serious medical incident: ${incident.title}`,
      `Category: ${incident.category}`,
      `Member: ${memberLabel}`,
      'Review in Medical department → Incidents.',
    ].join('\n');

    for (const staff of staffUsers) {
      await this.commQueue.enqueue(churchId, {
        kind: 'DIRECT_ALERT',
        title: 'Medical — serious incident',
        body,
        channels: ['IN_APP', 'EMAIL'],
        serviceUnitId,
        targetUserId: staff.id,
        metadata: { incidentId: incident.id },
      });
      await this.prisma.notification.create({
        data: {
          churchId,
          userId: staff.id,
          type: 'MEDICAL_INCIDENT',
          title: 'Serious medical incident',
          body,
          data: { incidentId: incident.id, serviceUnitId } as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async routeToPrayerTeam(
    churchId: string,
    incident: { title: string; description: string; subjectMemberId: string | null },
  ) {
    const prayerUnit = await this.prisma.serviceUnit.findFirst({
      where: {
        churchId,
        isActive: true,
        OR: [
          { departmentCode: 'PRAYER' },
          { name: { contains: 'Prayer', mode: 'insensitive' } },
        ],
      },
    });
    if (!prayerUnit) {
      this.logger.warn(`No prayer unit for church ${churchId} — skip prayer routing`);
      return null;
    }

    const subject = incident.subjectMemberId
      ? await this.prisma.member.findUnique({
          where: { id: incident.subjectMemberId },
          select: { firstName: true, lastName: true },
        })
      : null;

    return this.prisma.deptPrayerItem.create({
      data: {
        churchId,
        serviceUnitId: prayerUnit.id,
        requesterName: subject ? `${subject.firstName} ${subject.lastName}` : 'Medical team',
        content: `[Medical incident] ${incident.title}\n\n${incident.description}`,
        status: 'NEW',
      },
    });
  }

  async listIncidents(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptIncident.findMany({
      where: { serviceUnitId },
      orderBy: { occurredAt: 'desc' },
      take: 100,
      include: {
        reporter: { select: memberSelect },
        subjectMember: { select: memberSelect },
        recoveryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: { author: { select: memberSelect } },
        },
      },
    });
  }

  async createIncident(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      title: string;
      description: string;
      category?: MedicalIncidentCategory;
      severity?: string;
      occurredAt: string;
      subjectMemberId?: string;
      memberHint?: { firstName?: string; lastName?: string; phone?: string };
      followUpRequired?: boolean;
      requestPrayerTeam?: boolean;
    },
  ) {
    const { ctx } = await this.access.requireParticipate(userId, churchId, serviceUnitId);
    if (!ctx.memberId) throw new BadRequestException('Member profile required');

    await this.requireMedicalUnit(userId, churchId, serviceUnitId);

    const category = body.category ?? 'OTHER';
    const severity = body.severity ?? 'LOW';
    const subjectMemberId = await this.resolveSubjectMember(
      churchId,
      body.subjectMemberId,
      body.memberHint,
    );
    const serious = isSeriousIncident(category, severity);
    const followUpRequired = body.followUpRequired === true;
    const prayerTeamRequested =
      body.requestPrayerTeam === true || (serious && body.requestPrayerTeam !== false);

    const recoveryStatus: MedicalRecoveryStatus = followUpRequired
      ? serious
        ? 'CRITICAL'
        : 'MONITORING'
      : 'NOT_APPLICABLE';

    const incident = await this.prisma.deptIncident.create({
      data: {
        churchId,
        serviceUnitId,
        reporterId: ctx.memberId,
        subjectMemberId,
        title: body.title,
        description: body.description,
        category,
        severity,
        followUpRequired,
        recoveryStatus,
        prayerTeamRequested,
        occurredAt: new Date(body.occurredAt),
        recoveryUpdatedAt: followUpRequired ? new Date() : null,
      },
      include: {
        reporter: { select: memberSelect },
        subjectMember: { select: memberSelect },
      },
    });

    if (followUpRequired && subjectMemberId) {
      await this.prisma.deptFollowUpLog.create({
        data: {
          churchId,
          serviceUnitId,
          memberId: subjectMemberId,
          authorId: ctx.memberId,
          body: `Health follow-up after incident: ${body.title} (${category})`,
        },
      });
      await this.prisma.deptMedicalRecoveryLog.create({
        data: {
          incidentId: incident.id,
          status: recoveryStatus,
          note: 'Initial health follow-up opened',
          authorId: ctx.memberId,
        },
      });
    }

    if (serious) {
      await this.notifyLeadership(churchId, serviceUnitId, incident);
      await this.prisma.deptIncident.update({
        where: { id: incident.id },
        data: { leadershipNotifiedAt: new Date() },
      });
    }

    if (prayerTeamRequested && serious) {
      await this.routeToPrayerTeam(churchId, incident);
    }

    return this.prisma.deptIncident.findUnique({
      where: { id: incident.id },
      include: {
        reporter: { select: memberSelect },
        subjectMember: { select: memberSelect },
        recoveryLogs: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
  }

  async updateIncident(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    incidentId: string,
    body: {
      recoveryStatus?: MedicalRecoveryStatus;
      recoveryNote?: string;
      resolved?: boolean;
      followUpRequired?: boolean;
    },
  ) {
    const { ctx } = await this.access.requireManage(userId, churchId, serviceUnitId);
    if (!ctx.memberId) throw new BadRequestException('Member profile required');
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);

    const incident = await this.prisma.deptIncident.findFirst({
      where: { id: incidentId, serviceUnitId, churchId },
    });
    if (!incident) throw new NotFoundException('Incident not found');

    if (body.recoveryStatus && ctx.memberId) {
      await this.prisma.deptMedicalRecoveryLog.create({
        data: {
          incidentId,
          status: body.recoveryStatus,
          note: body.recoveryNote,
          authorId: ctx.memberId,
        },
      });
    }

    return this.prisma.deptIncident.update({
      where: { id: incidentId },
      data: {
        recoveryStatus: body.recoveryStatus,
        recoveryUpdatedAt: body.recoveryStatus ? new Date() : undefined,
        followUpRequired: body.followUpRequired,
        resolvedAt: body.resolved ? new Date() : undefined,
      },
      include: {
        subjectMember: { select: memberSelect },
        recoveryLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
  }

  async listTeamAttendance(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);
    return this.prisma.deptMedicalTeamAttendance.findMany({
      where: { serviceUnitId },
      orderBy: { serviceDate: 'desc' },
      take: 100,
      include: {
        member: { select: memberSelect },
        recordedBy: { select: memberSelect },
      },
    });
  }

  async logTeamAttendance(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    body: {
      memberId: string;
      serviceDate: string;
      role?: string;
      notes?: string;
    },
  ) {
    const { ctx } = await this.access.requireManage(userId, churchId, serviceUnitId);
    if (!ctx.memberId) throw new BadRequestException('Member profile required');
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);

    const serviceDate = new Date(`${body.serviceDate}T12:00:00.000Z`);

    return this.prisma.deptMedicalTeamAttendance.upsert({
      where: {
        serviceUnitId_memberId_serviceDate: {
          serviceUnitId,
          memberId: body.memberId,
          serviceDate,
        },
      },
      create: {
        churchId,
        serviceUnitId,
        memberId: body.memberId,
        serviceDate,
        role: body.role,
        notes: body.notes,
        recordedById: ctx.memberId,
      },
      update: { role: body.role, notes: body.notes },
      include: { member: { select: memberSelect } },
    });
  }

  async notifyAbsentees(
    userId: string,
    churchId: string,
    serviceUnitId: string,
    serviceDate?: string,
  ) {
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);
    await this.access.requireManage(userId, churchId, serviceUnitId);
    return this.deptReports.notifyAbsentees(userId, churchId, serviceUnitId, serviceDate);
  }

  async generateWeeklyReport(userId: string, churchId: string, serviceUnitId: string) {
    await this.requireMedicalUnit(userId, churchId, serviceUnitId);
    const base = await this.deptReports.generateWeeklyReport(
      churchId,
      serviceUnitId,
      undefined,
      userId,
    );

    const weekStart = base.weekStart;
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const [incidents, openFollowUp, teamServed, seriousCount] = await Promise.all([
      this.prisma.deptIncident.count({
        where: { serviceUnitId, occurredAt: { gte: weekStart, lt: weekEnd } },
      }),
      this.prisma.deptIncident.count({
        where: { serviceUnitId, followUpRequired: true, resolvedAt: null },
      }),
      this.prisma.deptMedicalTeamAttendance.count({
        where: { serviceUnitId, serviceDate: { gte: weekStart, lt: weekEnd } },
      }),
      this.prisma.deptIncident.count({
        where: {
          serviceUnitId,
          occurredAt: { gte: weekStart, lt: weekEnd },
          leadershipNotifiedAt: { not: null },
        },
      }),
    ]);

    const medicalBody = [
      base.body,
      '',
      'Medical incident summary:',
      `Incidents this week: ${incidents}`,
      `Serious (leadership notified): ${seriousCount}`,
      `Open health follow-ups: ${openFollowUp}`,
      `Medical personnel on duty (log entries): ${teamServed}`,
    ].join('\n');

    const stats = {
      ...(typeof base.stats === 'object' && base.stats !== null ? (base.stats as object) : {}),
      medicalIncidentsWeek: incidents,
      medicalSeriousWeek: seriousCount,
      medicalOpenFollowUps: openFollowUp,
      medicalTeamAttendanceEntries: teamServed,
    };

    return this.prisma.serviceUnitWeeklyReport.update({
      where: { id: base.id },
      data: { body: medicalBody, stats: stats as Prisma.InputJsonValue },
    });
  }
}
