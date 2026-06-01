import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.module';
import { buildWeeklySuggestions, isoWeekKey, weekRangeFromKey } from '../devotional-week.util';

@Injectable()
export class DevotionalWeeklyReviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });
    if (!member) return null;
    return member;
  }

  async getWeeklyReview(churchId: string, userId: string, weekKey?: string) {
    const member = await this.requireMember(churchId, userId);
    if (!member) {
      return {
        weekKey: weekKey ?? isoWeekKey(),
        completed: [],
        skipped: [],
        pending: [],
        planProgress: [],
        suggestedAdjustments: ['Link your member profile to track weekly review.'],
        stats: { completedCount: 0, skippedCount: 0, pendingCount: 0 },
      };
    }

    const key = weekKey ?? isoWeekKey();
    const { start, end } = weekRangeFromKey(key);

    const [actionPoints, progressRows] = await Promise.all([
      this.prisma.devotionalActionPoint.findMany({
        where: {
          churchId,
          memberId: member.id,
          OR: [{ weekKey: key }, { createdAt: { gte: start, lt: end } }],
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.devotionalStudyProgress.findMany({
        where: {
          churchId,
          memberId: member.id,
          lastReadAt: { gte: start, lt: end },
        },
        include: { plan: { select: { id: true, title: true } } },
      }),
    ]);

    const completed = actionPoints.filter((a) => a.status === 'COMPLETED');
    const skipped = actionPoints.filter((a) => a.status === 'SKIPPED');
    const pending = actionPoints.filter((a) => a.status === 'PENDING');

    const planDaysCompleted = progressRows.reduce((sum, p) => sum + (p.lastDay > 0 ? 1 : 0), 0);
    const maxStreak = progressRows.reduce((max, p) => Math.max(max, p.streakDays), 0);

    const suggestedAdjustments = buildWeeklySuggestions({
      completed: completed.length,
      skipped: skipped.length,
      pending: pending.length,
      planDaysCompleted,
      streakDays: maxStreak,
    });

    return {
      weekKey: key,
      range: { start: start.toISOString(), end: end.toISOString() },
      completed: completed.map((a) => ({
        id: a.id,
        title: a.title,
        completedAt: a.completedAt?.toISOString(),
      })),
      skipped: skipped.map((a) => ({
        id: a.id,
        title: a.title,
        skippedAt: a.skippedAt?.toISOString(),
      })),
      pending: pending.map((a) => ({
        id: a.id,
        title: a.title,
        dueAt: a.dueAt?.toISOString() ?? null,
      })),
      planProgress: progressRows.map((p) => ({
        planId: p.planId,
        planTitle: p.plan.title,
        lastDay: p.lastDay,
        streakDays: p.streakDays,
        lastReadAt: p.lastReadAt.toISOString(),
      })),
      suggestedAdjustments,
      stats: {
        completedCount: completed.length,
        skippedCount: skipped.length,
        pendingCount: pending.length,
        planDaysCompleted,
        maxStreak,
      },
    };
  }
}
