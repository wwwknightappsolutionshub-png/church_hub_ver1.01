import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';
import { DEVOTIONAL_LEADER_ROLES } from './devotional-hub.constants';

export interface DevotionalHubContext {
  userId: string;
  churchId: string;
  memberId: string | null;
  isLeader: boolean;
  canCreatePlans: boolean;
  integrations: {
    plans: boolean;
    groups: boolean;
    journals: boolean;
    prayerLists: boolean;
    reminders: boolean;
    ai: boolean;
    pdf: boolean;
    meetups: boolean;
    discussions: boolean;
  };
}

@Injectable()
export class DevotionalHubAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getContext(churchId: string, userId: string): Promise<DevotionalHubContext> {
    const roles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const roleNames = roles.map((r) => r.role.name);
    const isLeader = roleNames.some((n) =>
      (DEVOTIONAL_LEADER_ROLES as readonly string[]).includes(n),
    );
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      select: { id: true },
    });

    return {
      userId,
      churchId,
      memberId: member?.id ?? null,
      isLeader,
      canCreatePlans: true,
      integrations: {
        plans: true,
        groups: true,
        journals: !!member,
        prayerLists: !!member,
        reminders: !!member,
        ai: true,
        pdf: true,
        meetups: true,
        discussions: !!member,
      },
    };
  }
}
