import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AttendanceScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MembershipActivityService } from './membership-activity.service';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class MembershipAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: MembershipActivityService,
  ) {}

  async list(
    churchId: string,
    filters: {
      memberId?: string;
      familyId?: string;
      churchServiceId?: string;
      serviceUnitId?: string;
      scope?: AttendanceScope;
      from?: string;
      to?: string;
    },
  ) {
    const where: Prisma.AttendanceRecordWhereInput = { churchId };
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.familyId) where.familyId = filters.familyId;
    if (filters.churchServiceId) where.churchServiceId = filters.churchServiceId;
    if (filters.serviceUnitId) where.serviceUnitId = filters.serviceUnitId;
    if (filters.scope) where.scope = filters.scope;
    if (filters.from || filters.to) {
      where.serviceDate = {};
      if (filters.from) where.serviceDate.gte = startOfDay(new Date(filters.from));
      if (filters.to) {
        const t = startOfDay(new Date(filters.to));
        t.setUTCDate(t.getUTCDate() + 1);
        where.serviceDate.lt = t;
      }
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        churchService: { select: { id: true, name: true } },
        serviceUnit: { select: { id: true, name: true } },
      },
      orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
  }

  async recordOne(
    churchId: string,
    data: {
      memberId: string;
      scope: AttendanceScope;
      serviceDate: string;
      present?: boolean;
      churchServiceId?: string;
      serviceUnitId?: string;
      notes?: string;
    },
    recordedById?: string,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: data.memberId, churchId },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (data.scope === 'SERVICE' && !data.churchServiceId) {
      throw new BadRequestException('churchServiceId is required for SERVICE attendance');
    }
    if (data.scope === 'DEPARTMENT' && !data.serviceUnitId) {
      throw new BadRequestException('serviceUnitId is required for DEPARTMENT attendance');
    }

    const serviceDate = startOfDay(new Date(data.serviceDate));

    if (data.scope === 'SERVICE' && data.churchServiceId) {
      const svc = await this.prisma.churchService.findFirst({
        where: { id: data.churchServiceId, churchId },
      });
      if (!svc) throw new NotFoundException('Church service not found');
    }

    const existing = await this.prisma.attendanceRecord.findFirst({
      where: {
        memberId: data.memberId,
        scope: data.scope,
        serviceDate,
        churchServiceId: data.churchServiceId ?? null,
        serviceUnitId: data.serviceUnitId ?? null,
      },
    });

    const record = existing
      ? await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            present: data.present ?? true,
            notes: data.notes,
            recordedById,
            familyId: member.familyId,
          },
          include: {
            member: { select: { id: true, firstName: true, lastName: true } },
            churchService: true,
            serviceUnit: true,
          },
        })
      : await this.prisma.attendanceRecord.create({
          data: {
            churchId,
            memberId: data.memberId,
            scope: data.scope,
            serviceDate,
            present: data.present ?? true,
            churchServiceId: data.churchServiceId ?? null,
            serviceUnitId: data.serviceUnitId ?? null,
            familyId: member.familyId,
            notes: data.notes,
            recordedById,
          },
          include: {
            member: { select: { id: true, firstName: true, lastName: true } },
            churchService: true,
            serviceUnit: true,
          },
        });

    await this.activity.log(
      churchId,
      data.memberId,
      'ATTENDANCE_RECORDED',
      `${data.present === false ? 'Absent' : 'Present'} — ${data.scope} ${serviceDate.toISOString().slice(0, 10)}`,
      {
        actorUserId: recordedById,
        metadata: { attendanceId: record.id, scope: data.scope },
      },
    );

    return record;
  }

  /** Service-wide or family roll call */
  async recordBulk(
    churchId: string,
    data: {
      scope: AttendanceScope;
      serviceDate: string;
      churchServiceId?: string;
      serviceUnitId?: string;
      familyId?: string;
      entries: Array<{ memberId: string; present: boolean; notes?: string }>;
    },
    recordedById?: string,
  ) {
    const results = [];
    for (const entry of data.entries) {
      results.push(
        await this.recordOne(
          churchId,
          {
            memberId: entry.memberId,
            scope: data.scope,
            serviceDate: data.serviceDate,
            present: entry.present,
            churchServiceId: data.churchServiceId,
            serviceUnitId: data.serviceUnitId,
            notes: entry.notes,
          },
          recordedById,
        ),
      );
    }
    return { count: results.length, records: results };
  }

  async serviceSummary(churchId: string, churchServiceId: string, serviceDate: string) {
    const day = startOfDay(new Date(serviceDate));
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);

    const [present, absent, totalMembers] = await Promise.all([
      this.prisma.attendanceRecord.count({
        where: {
          churchId,
          churchServiceId,
          serviceDate: { gte: day, lt: next },
          scope: 'SERVICE',
          present: true,
        },
      }),
      this.prisma.attendanceRecord.count({
        where: {
          churchId,
          churchServiceId,
          serviceDate: { gte: day, lt: next },
          scope: 'SERVICE',
          present: false,
        },
      }),
      this.prisma.member.count({ where: { churchId, status: { not: 'VISITOR' } } }),
    ]);

    return {
      churchServiceId,
      serviceDate: day.toISOString(),
      present,
      absent,
      recorded: present + absent,
      unmarked: Math.max(0, totalMembers - present - absent),
    };
  }

  async familySummary(churchId: string, familyId: string, serviceDate: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, churchId },
      include: { members: { select: { id: true } } },
    });
    if (!family) throw new NotFoundException('Family not found');

    const day = startOfDay(new Date(serviceDate));
    const next = new Date(day);
    next.setUTCDate(next.getUTCDate() + 1);

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        churchId,
        familyId,
        serviceDate: { gte: day, lt: next },
      },
      include: { member: { select: { id: true, firstName: true, lastName: true } } },
    });

    return {
      familyId,
      serviceDate: day.toISOString(),
      memberCount: family.members.length,
      records,
    };
  }
}
