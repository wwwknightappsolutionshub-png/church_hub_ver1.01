import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.module';
import {
  YOUTH_ADMIN_ASSIGNER_ROLES,
  YOUTH_HUB_LEADER_ROLES,
} from '../youth.constants';

export interface YouthAccessContext {
  userId: string;
  churchId: string;
  roleNames: string[];
  isLeader: boolean;
  isYouth: boolean;
  memberId: string | null;
  memberName: string | null;
  safeMode: {
    enabled: boolean;
    strict: boolean;
    description: string;
  };
  permissions: {
    moderateContent: boolean;
    manageEvents: boolean;
    manageGroups: boolean;
    manageResources: boolean;
    managePrayerWall: boolean;
    awardPoints: boolean;
    qaLeaderQueue: boolean;
    viewParentLinks: boolean;
    assignYouthAdmins: boolean;
    manageYouthHub: boolean;
  };
  gamification: {
    points: number;
    level: number;
    tierTitle: string;
  } | null;
  integrations: {
    events: boolean;
    feed: boolean;
    chat: boolean;
    qa: boolean;
    prayer: boolean;
  };
}

@Injectable()
export class YouthAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Shared RBAC check for youth modules (Phase 10/11). */
  async isLeader(userId: string): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((r) => r.role.name);
    return roleNames.some((n) =>
      (YOUTH_HUB_LEADER_ROLES as readonly string[]).includes(n),
    );
  }

  async getContext(churchId: string, userId: string): Promise<YouthAccessContext> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((r) => r.role.name);
    const isLeader = roleNames.some((n) =>
      (YOUTH_HUB_LEADER_ROLES as readonly string[]).includes(n),
    );
    const canAssignYouthAdmins = roleNames.some((n) =>
      (YOUTH_ADMIN_ASSIGNER_ROLES as readonly string[]).includes(n),
    );

    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        roles: true,
        gamification: { select: { points: true } },
      },
    });

    const isYouth = member?.roles.includes('YOUTH') ?? false;
    const levelRow = member
      ? await this.prisma.youthUserLevel.findUnique({
          where: { memberId: member.id },
        })
      : null;

    return {
      userId,
      churchId,
      roleNames,
      isLeader,
      isYouth,
      memberId: member?.id ?? null,
      memberName: member
        ? `${member.firstName} ${member.lastName}`
        : null,
      safeMode: {
        enabled: true,
        strict: !isLeader,
        description: isLeader
          ? 'Leaders have relaxed filters; youth content still scanned for harm keywords.'
          : 'Contact info, external links, and harmful keywords are blocked.',
      },
      permissions: {
        moderateContent: isLeader,
        manageEvents: isLeader,
        manageGroups: isLeader,
        manageResources: isLeader,
        managePrayerWall: isLeader,
        awardPoints: isLeader,
        qaLeaderQueue: isLeader,
        viewParentLinks: isLeader,
        assignYouthAdmins: canAssignYouthAdmins,
        manageYouthHub: isLeader,
      },
      gamification: member
        ? {
            points: member.gamification?.points ?? 0,
            level: levelRow?.level ?? 1,
            tierTitle: levelRow?.tierTitle ?? 'Spark',
          }
        : null,
      integrations: {
        events: true,
        feed: true,
        chat: true,
        qa: true,
        prayer: true,
      },
    };
  }
}
