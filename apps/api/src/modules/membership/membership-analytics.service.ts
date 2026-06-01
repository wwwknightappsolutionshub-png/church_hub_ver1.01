import { Injectable } from '@nestjs/common';
import { FollowUpStage, MemberStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  attendanceRate,
  buildMonthBuckets,
  buildWeekBuckets,
  retentionRate,
} from './membership-analytics.util';

const RETAINED_STATUSES: MemberStatus[] = ['NEW_MEMBER', 'ACTIVE_MEMBER', 'DISCIPLED'];
const COMPLETED_STAGE: FollowUpStage = 'JOINED_GROUP';

export interface MembershipAnalyticsDashboard {
  generatedAt: string;
  periodMonths: number;
  summary: {
    totalMembers: number;
    activeMembers: number;
    outreachContacts: number;
    followUpCompletionRate: number;
    averageAttendanceRate: number;
  };
  growthTrends: {
    memberGrowth: Array<{ period: string; total: number; newInPeriod: number }>;
    newConvertGrowth: Array<{ period: string; outreachContacts: number; newMembers: number }>;
    firstTimerRetention: Array<{
      period: string;
      newVisitors: number;
      retained: number;
      retentionRate: number;
    }>;
  };
  absenteeTrends: Array<{ period: string; absent: number; present: number; rate: number }>;
  attendancePerformance: Array<{ period: string; present: number; absent: number; rate: number }>;
  departmentPerformance: Array<{
    serviceUnitId: string;
    name: string;
    present: number;
    absent: number;
    rate: number;
  }>;
  followUpCompleteness: Array<{
    period: string;
    created: number;
    completed: number;
    completionRate: number;
  }>;
  followUpByStage: Array<{ stage: FollowUpStage; count: number }>;
}

@Injectable()
export class MembershipAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(churchId: string, periodMonths = 6): Promise<MembershipAnalyticsDashboard> {
    const months = buildMonthBuckets(periodMonths);
    const weeks = buildWeekBuckets(8);
    const rangeStart = months[0]?.start ?? new Date();

    const [
      totalMembers,
      activeMembers,
      outreachContacts,
      followUpTotal,
      followUpCompleted,
      followUpByStage,
      memberGrowth,
      newConvertGrowth,
      firstTimerRetention,
      weeklyAttendance,
      departmentPerformance,
      followUpCompleteness,
      recentAttendance,
    ] = await Promise.all([
      this.prisma.member.count({ where: { churchId } }),
      this.prisma.member.count({
        where: { churchId, status: { in: ['ACTIVE_MEMBER', 'DISCIPLED'] } },
      }),
      this.prisma.outreachContact.count({ where: { churchId } }),
      this.prisma.followUp.count({ where: { churchId } }),
      this.prisma.followUp.count({ where: { churchId, stage: COMPLETED_STAGE } }),
      this.prisma.followUp.groupBy({
        by: ['stage'],
        where: { churchId },
        _count: { id: true },
      }),
      this.buildMemberGrowth(churchId, months),
      this.buildNewConvertGrowth(churchId, months),
      this.buildFirstTimerRetention(churchId, months),
      this.buildWeeklyAttendance(churchId, weeks),
      this.buildDepartmentPerformance(churchId, rangeStart),
      this.buildFollowUpCompleteness(churchId, months),
      this.prisma.attendanceRecord.findMany({
        where: {
          churchId,
          scope: 'SERVICE',
          serviceDate: { gte: rangeStart },
        },
        select: { present: true },
      }),
    ]);

    const presentCount = recentAttendance.filter((r) => r.present).length;
    const absentCount = recentAttendance.filter((r) => !r.present).length;

    return {
      generatedAt: new Date().toISOString(),
      periodMonths,
      summary: {
        totalMembers,
        activeMembers,
        outreachContacts,
        followUpCompletionRate:
          followUpTotal > 0 ? Math.round((followUpCompleted / followUpTotal) * 1000) / 1000 : 0,
        averageAttendanceRate: attendanceRate(presentCount, absentCount),
      },
      growthTrends: {
        memberGrowth,
        newConvertGrowth,
        firstTimerRetention,
      },
      absenteeTrends: weeklyAttendance.map((w) => ({
        period: w.period,
        absent: w.absent,
        present: w.present,
        rate: w.absent + w.present > 0 ? w.absent / (w.absent + w.present) : 0,
      })),
      attendancePerformance: weeklyAttendance,
      departmentPerformance,
      followUpCompleteness,
      followUpByStage: followUpByStage.map((g) => ({
        stage: g.stage,
        count: g._count.id,
      })),
    };
  }

  private async buildMemberGrowth(
    churchId: string,
    months: ReturnType<typeof buildMonthBuckets>,
  ) {
    const results = [];
    for (const bucket of months) {
      const [total, newInPeriod] = await Promise.all([
        this.prisma.member.count({
          where: { churchId, createdAt: { lt: bucket.end } },
        }),
        this.prisma.member.count({
          where: { churchId, createdAt: { gte: bucket.start, lt: bucket.end } },
        }),
      ]);
      results.push({ period: bucket.key, total, newInPeriod });
    }
    return results;
  }

  private async buildNewConvertGrowth(
    churchId: string,
    months: ReturnType<typeof buildMonthBuckets>,
  ) {
    const results = [];
    for (const bucket of months) {
      const [outreachContacts, newMembers] = await Promise.all([
        this.prisma.outreachContact.count({
          where: { churchId, capturedAt: { gte: bucket.start, lt: bucket.end } },
        }),
        this.prisma.member.count({
          where: {
            churchId,
            createdAt: { gte: bucket.start, lt: bucket.end },
            status: { in: RETAINED_STATUSES },
          },
        }),
      ]);
      results.push({ period: bucket.key, outreachContacts, newMembers });
    }
    return results;
  }

  private async buildFirstTimerRetention(
    churchId: string,
    months: ReturnType<typeof buildMonthBuckets>,
  ) {
    const results = [];
    for (const bucket of months) {
      const newVisitors = await this.prisma.member.count({
        where: { churchId, createdAt: { gte: bucket.start, lt: bucket.end } },
      });
      const retained = await this.prisma.member.count({
        where: {
          churchId,
          createdAt: { gte: bucket.start, lt: bucket.end },
          status: { in: RETAINED_STATUSES },
        },
      });
      results.push({
        period: bucket.key,
        newVisitors,
        retained,
        retentionRate: retentionRate(retained, newVisitors),
      });
    }
    return results;
  }

  private async buildWeeklyAttendance(
    churchId: string,
    weeks: ReturnType<typeof buildWeekBuckets>,
  ) {
    const results = [];
    for (const bucket of weeks) {
      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['present'],
        where: {
          churchId,
          scope: 'SERVICE',
          serviceDate: { gte: bucket.start, lt: bucket.end },
        },
        _count: { id: true },
      });
      const present =
        records.find((r) => r.present === true)?._count.id ?? 0;
      const absent =
        records.find((r) => r.present === false)?._count.id ?? 0;
      results.push({
        period: bucket.key,
        present,
        absent,
        rate: attendanceRate(present, absent),
      });
    }
    return results;
  }

  private async buildDepartmentPerformance(churchId: string, since: Date) {
    const units = await this.prisma.serviceUnit.findMany({
      where: { churchId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    const results = [];
    for (const unit of units) {
      const records = await this.prisma.attendanceRecord.groupBy({
        by: ['present'],
        where: {
          churchId,
          scope: 'DEPARTMENT',
          serviceUnitId: unit.id,
          serviceDate: { gte: since },
        },
        _count: { id: true },
      });
      const present =
        records.find((r) => r.present === true)?._count.id ?? 0;
      const absent =
        records.find((r) => r.present === false)?._count.id ?? 0;
      if (present + absent === 0) continue;
      results.push({
        serviceUnitId: unit.id,
        name: unit.name,
        present,
        absent,
        rate: attendanceRate(present, absent),
      });
    }
    return results.sort((a, b) => b.rate - a.rate);
  }

  private async buildFollowUpCompleteness(
    churchId: string,
    months: ReturnType<typeof buildMonthBuckets>,
  ) {
    const results = [];
    for (const bucket of months) {
      const [created, completed] = await Promise.all([
        this.prisma.followUp.count({
          where: { churchId, createdAt: { gte: bucket.start, lt: bucket.end } },
        }),
        this.prisma.followUp.count({
          where: {
            churchId,
            stage: COMPLETED_STAGE,
            updatedAt: { gte: bucket.start, lt: bucket.end },
          },
        }),
      ]);
      results.push({
        period: bucket.key,
        created,
        completed,
        completionRate: retentionRate(completed, created),
      });
    }
    return results;
  }
}
