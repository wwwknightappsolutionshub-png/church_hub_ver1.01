import {

  BadRequestException,

  ForbiddenException,

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { DevotionalChallengeScope, DevotionalGroupMemberRole } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.module';

import { CreateChallengeDto, RecordChallengeProgressDto } from '../dto/challenge.dto';

import { buildDefaultMilestones } from '../devotional-challenge.util';

import { isoWeekKey, weekRangeFromKey } from '../devotional-week.util';



const ADMIN_ROLES: DevotionalGroupMemberRole[] = ['ADMIN', 'CO_ADMIN'];



@Injectable()

export class DevotionalChallengesService {

  constructor(private readonly prisma: PrismaService) {}



  private async requireMember(churchId: string, userId: string) {

    const member = await this.prisma.member.findFirst({

      where: { churchId, userId },

      select: { id: true, firstName: true, lastName: true },

    });

    if (!member) throw new BadRequestException('Member profile required');

    return member;

  }



  private async assertCanCreateChallenge(

    churchId: string,

    userId: string,

    scope: DevotionalChallengeScope,

    groupId?: string,

  ) {

    const member = await this.requireMember(churchId, userId);

    if (scope === 'INDIVIDUAL') return member;



    if (scope === 'GROUP') {

      if (!groupId) throw new BadRequestException('groupId required for group challenges');

      const m = await this.prisma.devotionalGroupMember.findUnique({

        where: { groupId_memberId: { groupId, memberId: member.id } },

      });

      if (!m || m.status !== 'ACTIVE' || !ADMIN_ROLES.includes(m.role)) {

        throw new ForbiddenException('Group admin required to create group challenges');

      }

    } else {

      const roles = await this.prisma.userRole.findMany({

        where: { userId },

        include: { role: true },

      });

      const names = roles.map((r) => r.role.name);

      const leader = ['ADMIN', 'PASTOR', 'LEADER', 'YOUTH_ADMIN'].some((n) => names.includes(n));

      if (!leader) {

        throw new ForbiddenException('Church leader role required for church-wide challenges');

      }

    }

    return member;

  }



  private async seedMilestones(challengeId: string, targetCount?: number | null) {

    const defs = buildDefaultMilestones(targetCount);

    await this.prisma.devotionalChallengeMilestone.createMany({

      data: defs.map((d) => ({

        challengeId,

        threshold: d.threshold,

        badgeKey: d.badgeKey,

        title: d.title,

        description: d.description,

        sortOrder: d.sortOrder,

      })),

    });

  }



  private mapChallengeSummary(

    c: {

      id: string;

      title: string;

      description: string | null;

      scope: DevotionalChallengeScope;

      startsAt: Date;

      endsAt: Date;

      targetCount: number | null;

      group: { id: string; name: string } | null;

      members: Array<{ progressCount: number }>;

      _count: { members: number };

    },

  ) {

    const membership = c.members[0];

    const progressCount = membership?.progressCount ?? 0;

    const target = c.targetCount;

    const percent =

      target && target > 0 ? Math.min(100, Math.round((progressCount / target) * 100)) : null;



    return {

      id: c.id,

      title: c.title,

      description: c.description,

      scope: c.scope,

      group: c.group,

      startsAt: c.startsAt.toISOString(),

      endsAt: c.endsAt.toISOString(),

      targetCount: c.targetCount,

      participantCount: c._count.members,

      joined: !!membership,

      progressCount,

      percentComplete: percent,

    };

  }



  async listForMember(churchId: string, userId: string, groupId?: string) {

    const member = await this.requireMember(churchId, userId);

    const now = new Date();



    const groupIds = groupId

      ? [groupId]

      : (

          await this.prisma.devotionalGroupMember.findMany({

            where: { memberId: member.id, status: 'ACTIVE' },

            select: { groupId: true },

          })

        ).map((g) => g.groupId);



    const challenges = await this.prisma.devotionalChallenge.findMany({

      where: {

        churchId,

        isActive: true,

        startsAt: { lte: now },

        endsAt: { gte: now },

        OR: [

          { scope: 'CHURCH' },
          ...(groupIds.length
            ? [{ scope: 'GROUP' as const, groupId: { in: groupIds } }]
            : []),
          {
            scope: 'INDIVIDUAL',
            members: { some: { memberId: member.id } },
          },

        ],

      },

      include: {

        group: { select: { id: true, name: true } },

        members: { where: { memberId: member.id } },

        _count: { select: { members: true } },

      },

      orderBy: [{ scope: 'asc' }, { startsAt: 'desc' }],

    });



    return challenges.map((c) => this.mapChallengeSummary(c));

  }



  async getDetail(churchId: string, userId: string, challengeId: string) {

    const member = await this.requireMember(churchId, userId);

    const challenge = await this.prisma.devotionalChallenge.findFirst({

      where: { id: challengeId, churchId },

      include: {

        group: { select: { id: true, name: true } },

        members: { where: { memberId: member.id } },

        milestones: { orderBy: { sortOrder: 'asc' } },

        _count: { select: { members: true } },

      },

    });

    if (!challenge) throw new NotFoundException('Challenge not found');



    if (challenge.scope === 'INDIVIDUAL' && challenge.members.length === 0) {

      throw new ForbiddenException('This personal challenge is private');

    }

    if (challenge.scope === 'GROUP' && challenge.groupId) {

      const gm = await this.prisma.devotionalGroupMember.findUnique({

        where: { groupId_memberId: { groupId: challenge.groupId, memberId: member.id } },

      });

      if (!gm || gm.status !== 'ACTIVE') {

        throw new ForbiddenException('Join the group to view this challenge');

      }

    }



    const progressCount = challenge.members[0]?.progressCount ?? 0;

    const earned = challenge.members.length

      ? await this.prisma.devotionalChallengeBadgeEarned.findMany({

          where: { challengeId, memberId: member.id },

          include: { milestone: true },

          orderBy: { earnedAt: 'asc' },

        })

      : [];



    const earnedIds = new Set(earned.map((e) => e.milestoneId));



    return {

      ...this.mapChallengeSummary(challenge),

      milestones: challenge.milestones.map((m) => ({

        id: m.id,

        threshold: m.threshold,

        badgeKey: m.badgeKey,

        title: m.title,

        description: m.description,

        earned: earnedIds.has(m.id),

        earnedAt: earned.find((e) => e.milestoneId === m.id)?.earnedAt.toISOString() ?? null,

      })),

      badges: earned.map((e) => ({

        milestoneId: e.milestoneId,

        badgeKey: e.milestone.badgeKey,

        title: e.milestone.title,

        earnedAt: e.earnedAt.toISOString(),

      })),

    };

  }



  async create(churchId: string, userId: string, dto: CreateChallengeDto) {

    const member = await this.assertCanCreateChallenge(

      churchId,

      userId,

      dto.scope as DevotionalChallengeScope,

      dto.groupId,

    );



    const row = await this.prisma.devotionalChallenge.create({

      data: {

        churchId,

        groupId: dto.scope === 'GROUP' ? dto.groupId : null,

        scope: dto.scope as DevotionalChallengeScope,

        title: dto.title.trim(),

        description: dto.description?.trim(),

        startsAt: new Date(dto.startsAt),

        endsAt: new Date(dto.endsAt),

        targetCount: dto.targetCount,

        createdById: member.id,

      },

    });



    await this.seedMilestones(row.id, row.targetCount);



    if (dto.scope === 'INDIVIDUAL') {

      await this.prisma.devotionalChallengeMember.create({

        data: { challengeId: row.id, memberId: member.id, progressCount: 0 },

      });

      await this.prisma.devotionalActionPoint.create({

        data: {

          churchId,

          memberId: member.id,

          challengeId: row.id,

          title: `Challenge: ${row.title}`,

          notes: row.description,

          weekKey: isoWeekKey(),

          remindersEnabled: false,

        },

      });

    }



    return {

      id: row.id,

      title: row.title,

      scope: row.scope,

      startsAt: row.startsAt.toISOString(),

      endsAt: row.endsAt.toISOString(),

      joined: dto.scope === 'INDIVIDUAL',

    };

  }



  async join(churchId: string, userId: string, challengeId: string) {

    const member = await this.requireMember(churchId, userId);

    const challenge = await this.prisma.devotionalChallenge.findFirst({

      where: { id: challengeId, churchId, isActive: true },

    });

    if (!challenge) throw new NotFoundException('Challenge not found');

    if (challenge.scope === 'INDIVIDUAL') {

      throw new BadRequestException('Personal challenges cannot be joined by others');

    }



    if (challenge.scope === 'GROUP' && challenge.groupId) {

      const gm = await this.prisma.devotionalGroupMember.findUnique({

        where: { groupId_memberId: { groupId: challenge.groupId, memberId: member.id } },

      });

      if (!gm || gm.status !== 'ACTIVE') {

        throw new ForbiddenException('Join the group before joining this challenge');

      }

    }



    await this.prisma.devotionalChallengeMember.upsert({

      where: { challengeId_memberId: { challengeId, memberId: member.id } },

      create: { challengeId, memberId: member.id, progressCount: 0 },

      update: {},

    });



    const existingAp = await this.prisma.devotionalActionPoint.findFirst({

      where: { churchId, memberId: member.id, challengeId, status: 'PENDING' },

    });

    if (!existingAp) {

      await this.prisma.devotionalActionPoint.create({

        data: {

          churchId,

          memberId: member.id,

          challengeId,

          groupId: challenge.groupId,

          title: `Challenge: ${challenge.title}`,

          notes: challenge.description,

          weekKey: isoWeekKey(),

          remindersEnabled: false,

        },

      });

    }



    return { ok: true, challengeId };

  }



  async recordProgress(

    churchId: string,

    userId: string,

    challengeId: string,

    dto: RecordChallengeProgressDto,

  ) {

    const member = await this.requireMember(churchId, userId);

    const increment = dto.increment ?? 1;

    return this.applyProgress(churchId, member.id, challengeId, increment);

  }



  /** Called when a linked action point is completed */

  async incrementFromActionPoint(churchId: string, memberId: string, challengeId: string) {

    return this.applyProgress(churchId, memberId, challengeId, 1);

  }



  private async applyProgress(

    churchId: string,

    memberId: string,

    challengeId: string,

    increment: number,

  ) {

    const challenge = await this.prisma.devotionalChallenge.findFirst({

      where: { id: challengeId, churchId, isActive: true },

    });

    if (!challenge) throw new NotFoundException('Challenge not found');



    const membership = await this.prisma.devotionalChallengeMember.findUnique({

      where: { challengeId_memberId: { challengeId, memberId } },

    });

    if (!membership) throw new ForbiddenException('Join the challenge first');



    const updated = await this.prisma.devotionalChallengeMember.update({

      where: { id: membership.id },

      data: { progressCount: { increment } },

    });



    const newBadges = await this.awardEligibleBadges(challengeId, memberId, updated.progressCount);



    return {

      challengeId,

      progressCount: updated.progressCount,

      targetCount: challenge.targetCount,

      newBadges,

    };

  }



  private async awardEligibleBadges(challengeId: string, memberId: string, progressCount: number) {

    const milestones = await this.prisma.devotionalChallengeMilestone.findMany({

      where: { challengeId, threshold: { lte: progressCount } },

      orderBy: { threshold: 'asc' },

    });

    if (!milestones.length) return [];



    const existing = await this.prisma.devotionalChallengeBadgeEarned.findMany({

      where: { challengeId, memberId },

      select: { milestoneId: true },

    });

    const have = new Set(existing.map((e) => e.milestoneId));

    const created: Array<{ badgeKey: string; title: string }> = [];



    for (const m of milestones) {

      if (have.has(m.id)) continue;

      await this.prisma.devotionalChallengeBadgeEarned.create({

        data: { challengeId, memberId, milestoneId: m.id },

      });

      created.push({ badgeKey: m.badgeKey, title: m.title });

      have.add(m.id);

    }

    return created;

  }



  async weeklyProgress(churchId: string, userId: string, weekKey?: string) {

    const member = await this.requireMember(churchId, userId);

    const key = weekKey ?? isoWeekKey();

    const { start, end } = weekRangeFromKey(key);



    const memberships = await this.prisma.devotionalChallengeMember.findMany({

      where: { memberId: member.id, challenge: { churchId, isActive: true } },

      include: {

        challenge: {

          select: {

            id: true,

            title: true,

            scope: true,

            targetCount: true,

            startsAt: true,

            endsAt: true,

          },

        },

      },

    });



    const challengeIds = memberships.map((m) => m.challengeId);

    const weekCounts = challengeIds.length

      ? await this.prisma.devotionalActionPoint.groupBy({

          by: ['challengeId'],

          where: {

            memberId: member.id,

            challengeId: { in: challengeIds },

            status: 'COMPLETED',

            OR: [

              { weekKey: key },

              { completedAt: { gte: start, lt: end } },

            ],

          },

          _count: { id: true },

        })

      : [];



    const weekMap = new Map(weekCounts.map((w) => [w.challengeId, w._count.id]));



    const badgesThisWeek = challengeIds.length

      ? await this.prisma.devotionalChallengeBadgeEarned.count({

          where: {

            memberId: member.id,

            challengeId: { in: challengeIds },

            earnedAt: { gte: start, lt: end },

          },

        })

      : 0;



    return {

      weekKey: key,

      range: { start: start.toISOString(), end: end.toISOString() },

      badgesEarnedThisWeek: badgesThisWeek,

      challenges: memberships.map((m) => {

        const progressThisWeek = weekMap.get(m.challengeId) ?? 0;

        const target = m.challenge.targetCount;

        const percent =

          target && target > 0

            ? Math.min(100, Math.round((m.progressCount / target) * 100))

            : null;

        return {

          challengeId: m.challenge.id,

          title: m.challenge.title,

          scope: m.challenge.scope,

          progressThisWeek,

          totalProgress: m.progressCount,

          targetCount: target,

          percentComplete: percent,

        };

      }),

    };

  }



  async myBadges(churchId: string, userId: string) {

    const member = await this.requireMember(churchId, userId);

    const earned = await this.prisma.devotionalChallengeBadgeEarned.findMany({

      where: { memberId: member.id, challenge: { churchId } },

      include: {

        milestone: true,

        challenge: { select: { id: true, title: true, scope: true } },

      },

      orderBy: { earnedAt: 'desc' },

      take: 50,

    });



    return earned.map((e) => ({

      challengeId: e.challengeId,

      challengeTitle: e.challenge.title,

      scope: e.challenge.scope,

      badgeKey: e.milestone.badgeKey,

      title: e.milestone.title,

      earnedAt: e.earnedAt.toISOString(),

    }));

  }



  async leaderboard(churchId: string, challengeId: string, userId?: string) {

    const challenge = await this.prisma.devotionalChallenge.findFirst({

      where: { id: challengeId, churchId },

    });

    if (!challenge) throw new NotFoundException('Challenge not found');



    if (challenge.scope === 'INDIVIDUAL') {

      if (userId) {

        const member = await this.requireMember(churchId, userId);

        const m = await this.prisma.devotionalChallengeMember.findUnique({

          where: { challengeId_memberId: { challengeId, memberId: member.id } },

        });

        if (!m) throw new ForbiddenException('Not your challenge');

      }

      const solo = await this.prisma.devotionalChallengeMember.findMany({

        where: { challengeId },

        include: { member: { select: { id: true, firstName: true, lastName: true } } },

      });

      return {

        challengeId,

        title: challenge.title,

        scope: challenge.scope,

        optional: true,

        entries: solo.map((s) => ({

          memberId: s.memberId,

          name: `${s.member.firstName} ${s.member.lastName}`,

          progressCount: s.progressCount,

        })),

      };

    }



    const members = await this.prisma.devotionalChallengeMember.findMany({

      where: { challengeId },

      include: { member: { select: { id: true, firstName: true, lastName: true } } },

      orderBy: { progressCount: 'desc' },

      take: 25,

    });



    return {

      challengeId,

      title: challenge.title,

      scope: challenge.scope,

      optional: true,

      entries: members.map((s, i) => ({

        rank: i + 1,

        memberId: s.memberId,

        name: `${s.member.firstName} ${s.member.lastName}`,

        progressCount: s.progressCount,

      })),

    };

  }

}


