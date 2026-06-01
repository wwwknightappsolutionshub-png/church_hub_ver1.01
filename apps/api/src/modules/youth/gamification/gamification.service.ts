import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, YouthPointSource } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.module';
import { levelFromXp, xpForLevel } from '../common/moderation.util';
import {
  DEFAULT_YOUTH_ACHIEVEMENTS,
  DEFAULT_YOUTH_CHALLENGES,
  SCORE_DELTAS,
  tierTitleForLevel,
} from './gamification.constants';
import { DEFAULT_YOUTH_BADGES, POINTS } from '../youth.constants';

@Injectable()
export class YouthGamificationService {
  static readonly MODULE_KEY = 'youth/gamification' as const;

  constructor(private readonly prisma: PrismaService) {}

  // ─── Dev hook for other youth modules ─────────────────────

  /**
   * Score a gamification event (points engine entry point).
   * @example await gamification.scoreEvent(churchId, memberId, YouthPointSource.RSVP, { sourceId: eventId })
   */
  async scoreEvent(
    churchId: string,
    memberId: string,
    source: YouthPointSource,
    opts?: {
      delta?: number;
      reason?: string;
      sourceId?: string;
      skipLedger?: boolean;
    },
  ) {
    const delta =
      opts?.delta ??
      SCORE_DELTAS[source] ??
      (source === YouthPointSource.MANUAL ? 0 : 0);
    if (delta === 0 && source !== YouthPointSource.REDEMPTION) {
      return this.getMemberProfile(churchId, memberId);
    }
    return this.applyPoints(
      churchId,
      memberId,
      delta,
      opts?.reason ?? source,
      source,
      opts?.sourceId,
      opts?.skipLedger,
    );
  }

  private async requireMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!member) {
      throw new BadRequestException(
        'Link your account to a member profile for gamification',
      );
    }
    return member;
  }

  private async syncUserLevel(memberId: string, xp: number) {
    const level = levelFromXp(xp);
    const xpToNextLevel = Math.max(0, xpForLevel(level + 1) - xp);
    return this.prisma.youthUserLevel.upsert({
      where: { memberId },
      create: {
        memberId,
        xp,
        level,
        xpToNextLevel,
        tierTitle: tierTitleForLevel(level),
      },
      update: {
        xp,
        level,
        xpToNextLevel,
        tierTitle: tierTitleForLevel(level),
      },
    });
  }

  private async applyPoints(
    churchId: string,
    memberId: string,
    delta: number,
    reason: string,
    source: YouthPointSource,
    sourceId?: string,
    skipLedger = false,
  ) {
    const g = await this.prisma.memberGamification.upsert({
      where: { memberId },
      create: {
        memberId,
        points: Math.max(0, delta),
        xp: Math.max(0, delta),
        level: levelFromXp(Math.max(0, delta)),
      },
      update: {
        points: { increment: delta },
        xp: { increment: delta },
      },
      include: { badges: { include: { badge: true } } },
    });

    const newPoints = Math.max(0, g.points);
    const newXp = Math.max(0, g.xp);
    const newLevel = levelFromXp(newXp);

    await this.prisma.memberGamification.update({
      where: { memberId },
      data: { level: newLevel },
    });

    await this.syncUserLevel(memberId, newXp);

    if (!skipLedger) {
      await this.prisma.youthPointLedger.create({
        data: {
          churchId,
          memberId,
          delta,
          balanceAfter: newPoints,
          reason,
          source,
          sourceId,
        },
      });
    }

    await this.autoIssuePointBadges(memberId, newPoints);
    await this.evaluateAchievements(churchId, memberId);

    return this.getMemberProfile(churchId, memberId);
  }

  private async autoIssuePointBadges(memberId: string, points: number) {
    const badges = await this.prisma.badge.findMany({
      where: { pointsRequired: { lte: points } },
    });
    for (const badge of badges) {
      const g = await this.prisma.memberGamification.findUnique({
        where: { memberId },
      });
      if (!g) continue;
      await this.prisma.memberBadge.upsert({
        where: { memberId_badgeId: { memberId, badgeId: badge.id } },
        create: { memberId, badgeId: badge.id },
        update: {},
      });
    }
  }

  private async evaluateAchievements(churchId: string, memberId: string) {
    const achievements = await this.prisma.youthAchievement.findMany({
      where: { churchId, isActive: true },
    });
    const g = await this.prisma.memberGamification.findUnique({
      where: { memberId },
    });
    if (!g) return;

    const ledgerCounts = await this.prisma.youthPointLedger.groupBy({
      by: ['source'],
      where: { memberId },
      _count: { id: true },
    });
    const sourceMap = Object.fromEntries(
      ledgerCounts.map((r) => [r.source, r._count.id]),
    );

    const challengesDone = await this.prisma.youthChallengeProgress.count({
      where: { memberId, completedAt: { not: null } },
    });

    for (const ach of achievements) {
      const unlocked = await this.prisma.youthMemberAchievement.findUnique({
        where: {
          memberId_achievementId: { memberId, achievementId: ach.id },
        },
      });
      if (unlocked) continue;

      const criteria = ach.criteria as Record<string, unknown>;
      let met = false;

      if (criteria.attendanceStreak && g.attendanceStreak >= (criteria.attendanceStreak as number)) {
        met = true;
      }
      if (criteria.source && criteria.count) {
        const src = criteria.source as string;
        const count = await this.prisma.youthPointLedger.count({
          where: {
            memberId,
            source: src as YouthPointSource,
          },
        });
        if (count >= (criteria.count as number)) met = true;
      }
      if (criteria.challengesCompleted && challengesDone >= (criteria.challengesCompleted as number)) {
        met = true;
      }
      if (criteria.feedActions) {
        const feedCount =
          (sourceMap[YouthPointSource.POST] ?? 0) +
          (sourceMap[YouthPointSource.COMMENT] ?? 0);
        if (feedCount >= (criteria.feedActions as number)) met = true;
      }

      if (met) await this.unlockAchievement(churchId, memberId, ach.id);
    }
  }

  async unlockAchievement(churchId: string, memberId: string, achievementId: string) {
    const ach = await this.prisma.youthAchievement.findFirst({
      where: { id: achievementId, churchId },
    });
    if (!ach) throw new NotFoundException('Achievement not found');

    await this.prisma.youthMemberAchievement.upsert({
      where: { memberId_achievementId: { memberId, achievementId } },
      create: { memberId, achievementId },
      update: {},
    });

    if (ach.badgeId) {
      const g = await this.prisma.memberGamification.findUnique({
        where: { memberId },
      });
      if (g) {
        await this.prisma.memberBadge.upsert({
          where: { memberId_badgeId: { memberId, badgeId: ach.badgeId } },
          create: { memberId, badgeId: ach.badgeId },
          update: {},
        });
      }
    }

    if (ach.pointsAward > 0) {
      await this.applyPoints(
        churchId,
        memberId,
        ach.pointsAward,
        `Achievement: ${ach.name}`,
        YouthPointSource.MANUAL,
        achievementId,
      );
    }

    return ach;
  }

  async issueBadge(memberId: string, badgeId: string) {
    const badge = await this.prisma.badge.findUnique({ where: { id: badgeId } });
    if (!badge) throw new NotFoundException('Badge not found');
    const g = await this.prisma.memberGamification.findUnique({
      where: { memberId },
    });
    if (!g) {
      await this.prisma.memberGamification.create({ data: { memberId } });
    }
    return this.prisma.memberBadge.upsert({
      where: { memberId_badgeId: { memberId, badgeId } },
      create: { memberId, badgeId },
      update: {},
      include: { badge: true },
    });
  }

  async recordAttendanceStreak(memberId: string) {
    const g = await this.prisma.memberGamification.findUnique({ where: { memberId } });
    const now = new Date();
    if (!g) {
      return this.prisma.memberGamification.create({
        data: { memberId, attendanceStreak: 1, lastAttendance: now },
      });
    }
    const last = g.lastAttendance;
    let streak = g.attendanceStreak;
    if (last) {
      const days = Math.floor((now.getTime() - last.getTime()) / 86400000);
      streak = days <= 7 ? streak + 1 : 1;
    } else {
      streak = 1;
    }
    return this.prisma.memberGamification.update({
      where: { memberId },
      data: { attendanceStreak: streak, lastAttendance: now },
    });
  }

  async ensureYouthBadges() {
    for (const b of DEFAULT_YOUTH_BADGES) {
      const exists = await this.prisma.badge.findFirst({ where: { name: b.name } });
      if (!exists) await this.prisma.badge.create({ data: b });
    }
  }

  async ensureChurchAchievements(churchId: string) {
    for (const a of DEFAULT_YOUTH_ACHIEVEMENTS) {
      await this.prisma.youthAchievement.upsert({
        where: { churchId_key: { churchId, key: a.key } },
        create: {
          churchId,
          key: a.key,
          name: a.name,
          description: a.description,
          pointsAward: a.pointsAward,
          criteria: a.criteria as Prisma.InputJsonValue,
        },
        update: {},
      });
    }
  }

  async ensureChurchChallenges(churchId: string) {
    for (const c of DEFAULT_YOUTH_CHALLENGES) {
      const exists = await this.prisma.youthChallenge.findFirst({
        where: { churchId, title: c.title },
      });
      if (!exists) {
        await this.prisma.youthChallenge.create({
          data: { churchId, ...c },
        });
      }
    }
  }

  async getMemberProfile(churchId: string, memberId: string) {
    const [g, level, badges, achievements, challengeProgress, recentLedger] =
      await Promise.all([
        this.prisma.memberGamification.findUnique({
          where: { memberId },
          include: {
            member: { select: { id: true, firstName: true, lastName: true } },
            badges: { include: { badge: true }, orderBy: { awardedAt: 'desc' } },
          },
        }),
        this.prisma.youthUserLevel.findUnique({ where: { memberId } }),
        this.prisma.memberBadge.findMany({
          where: { memberId },
          include: { badge: true },
          orderBy: { awardedAt: 'desc' },
        }),
        this.prisma.youthMemberAchievement.findMany({
          where: { memberId, achievement: { churchId } },
          include: { achievement: true },
        }),
        this.prisma.youthChallengeProgress.findMany({
          where: { memberId, challenge: { churchId, isActive: true } },
          include: { challenge: true },
        }),
        this.prisma.youthPointLedger.findMany({
          where: { memberId, churchId },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
      ]);

    if (!g) {
      return {
        memberId,
        points: 0,
        xp: 0,
        level: 1,
        attendanceStreak: 0,
        tierTitle: 'Spark',
        xpToNextLevel: 100,
        badges: [],
        achievements: [],
        challenges: [],
        recentLedger: [],
        rank: null,
      };
    }

    const rank = await this.getMemberRank(churchId, memberId);

    return {
      memberId,
      member: g.member,
      points: g.points,
      xp: level?.xp ?? g.xp,
      level: level?.level ?? g.level,
      tierTitle: level?.tierTitle ?? tierTitleForLevel(g.level),
      xpToNextLevel: level?.xpToNextLevel ?? xpForLevel(g.level + 1),
      attendanceStreak: g.attendanceStreak,
      badges,
      achievements: achievements.map((a) => a.achievement),
      challenges: challengeProgress.map((p) => ({
        ...p.challenge,
        progress: p.progress,
        completedAt: p.completedAt,
        targetCount: p.challenge.targetCount,
      })),
      recentLedger,
      rank,
    };
  }

  private async getMemberRank(churchId: string, memberId: string) {
    const all = await this.prisma.memberGamification.findMany({
      where: { member: { churchId } },
      orderBy: { points: 'desc' },
      select: { memberId: true },
    });
    const idx = all.findIndex((r) => r.memberId === memberId);
    return idx >= 0 ? idx + 1 : null;
  }

  async getMe(churchId: string, userId: string) {
    const member = await this.requireMember(churchId, userId);
    await this.ensureYouthBadges();
    await this.ensureChurchAchievements(churchId);
    await this.ensureChurchChallenges(churchId);
    const g = await this.prisma.memberGamification.upsert({
      where: { memberId: member.id },
      create: { memberId: member.id },
      update: {},
    });
    await this.syncUserLevel(member.id, g.xp);
    return this.getMemberProfile(churchId, member.id);
  }

  async getLeaderboard(churchId: string, limit = 25) {
    await this.ensureYouthBadges();
    const rows = await this.prisma.memberGamification.findMany({
      where: { member: { churchId } },
      orderBy: [{ points: 'desc' }, { attendanceStreak: 'desc' }],
      take: limit,
      include: {
        member: { select: { id: true, firstName: true, lastName: true, roles: true } },
        badges: { include: { badge: true }, take: 3 },
      },
    });

    const levels = await this.prisma.youthUserLevel.findMany({
      where: { memberId: { in: rows.map((r) => r.memberId) } },
    });
    const levelMap = Object.fromEntries(levels.map((l) => [l.memberId, l]));

    return rows.map((row, index) => ({
      rank: index + 1,
      memberId: row.memberId,
      points: row.points,
      xp: levelMap[row.memberId]?.xp ?? row.xp,
      level: levelMap[row.memberId]?.level ?? row.level,
      tierTitle: levelMap[row.memberId]?.tierTitle ?? tierTitleForLevel(row.level),
      attendanceStreak: row.attendanceStreak,
      member: row.member,
      badges: row.badges,
    }));
  }

  listBadges() {
    return this.prisma.badge.findMany({ orderBy: { pointsRequired: 'asc' } });
  }

  listAchievements(churchId: string) {
    return this.prisma.youthAchievement.findMany({
      where: { churchId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  listChallenges(churchId: string, memberId?: string) {
    return this.prisma.youthChallenge.findMany({
      where: { churchId, isActive: true },
      include: memberId
        ? {
            progress: { where: { memberId } },
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createChallenge(
    churchId: string,
    data: {
      title: string;
      description?: string;
      points?: number;
      challengeType?: string;
      targetCount?: number;
      startsAt?: string;
      endsAt?: string;
    },
  ) {
    if (!data.title?.trim()) throw new BadRequestException('Title is required');
    return this.prisma.youthChallenge.create({
      data: {
        churchId,
        title: data.title.trim(),
        description: data.description,
        points: data.points ?? 25,
        challengeType: data.challengeType ?? 'CUSTOM',
        targetCount: data.targetCount ?? 1,
        startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
        endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
      },
    });
  }

  async incrementChallenge(
    churchId: string,
    memberId: string,
    challengeId: string,
    increment = 1,
  ) {
    const challenge = await this.prisma.youthChallenge.findFirst({
      where: { id: challengeId, churchId, isActive: true },
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const existing = await this.prisma.youthChallengeProgress.findUnique({
      where: { memberId_challengeId: { memberId, challengeId } },
    });

    const progress = Math.min(
      challenge.targetCount,
      (existing?.progress ?? 0) + increment,
    );

    const row = await this.prisma.youthChallengeProgress.upsert({
      where: { memberId_challengeId: { memberId, challengeId } },
      create: { memberId, challengeId, progress },
      update: { progress },
      include: { challenge: true },
    });

    if (progress >= challenge.targetCount && !row.completedAt) {
      await this.prisma.youthChallengeProgress.update({
        where: { memberId_challengeId: { memberId, challengeId } },
        data: { completedAt: new Date() },
      });
      await this.scoreEvent(churchId, memberId, YouthPointSource.CHALLENGE, {
        delta: challenge.points,
        reason: `Challenge: ${challenge.title}`,
        sourceId: challengeId,
      });
    }

    return row;
  }

  /** Legacy: award points without source typing */
  async awardPoints(memberId: string, points: number, churchId?: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { churchId: true },
    });
    const cid = churchId ?? member?.churchId;
    if (!cid) throw new NotFoundException('Member not found');
    return this.scoreEvent(cid, memberId, YouthPointSource.MANUAL, {
      delta: points,
      reason: 'Manual award',
    });
  }

  listLedger(churchId: string, memberId: string, limit = 50) {
    return this.prisma.youthPointLedger.findMany({
      where: { churchId, memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
