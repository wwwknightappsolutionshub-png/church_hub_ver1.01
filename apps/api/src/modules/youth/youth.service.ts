import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  HelpRequestCategory,
  HelpRequestStatus,
  Prisma,
  YouthPointSource,
  YouthResourceCategory,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { YouthGamificationService } from './gamification/gamification.service';
import { YOUTH_HUB_LEADER_ROLES } from './youth.constants';

@Injectable()
export class YouthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamification: YouthGamificationService,
  ) {}

  async getStats(churchId: string) {
    const [
      groups,
      events,
      openHelp,
      resources,
      channels,
      topPoints,
    ] = await Promise.all([
      this.prisma.youthGroup.count({ where: { churchId, isActive: true } }),
      this.prisma.youthEvent.count({
        where: { churchId, startsAt: { gte: new Date() } },
      }),
      this.prisma.youthHelpRequest.count({
        where: { churchId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      }),
      this.prisma.youthResource.count({ where: { churchId, isPublished: true } }),
      this.prisma.chatChannel.count({ where: { churchId } }),
      this.prisma.memberGamification.findMany({
        where: { member: { churchId, roles: { has: 'YOUTH' } } },
        orderBy: { points: 'desc' },
        take: 5,
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    const members = await this.prisma.youthGroupMember.count({
      where: { youthGroup: { churchId, isActive: true } },
    });

    return { groups, members, events, openHelp, resources, channels, leaderboard: topPoints };
  }

  // ─── Groups ───────────────────────────────────────────────

  listGroups(churchId: string) {
    return this.prisma.youthGroup.findMany({
      where: { churchId, isActive: true },
      include: {
        _count: { select: { members: true, events: true, channels: true } },
        members: {
          take: 8,
          include: { member: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  getGroup(churchId: string, id: string) {
    return this.prisma.youthGroup.findFirst({
      where: { id, churchId },
      include: {
        members: { include: { member: { include: { gamification: true } } } },
        events: { orderBy: { startsAt: 'asc' }, take: 10 },
        channels: true,
        resources: { where: { isPublished: true } },
      },
    });
  }

  createGroup(
    churchId: string,
    data: { name: string; description?: string; minAge?: number; maxAge?: number; leaderId?: string },
  ) {
    return this.prisma.youthGroup.create({
      data: { churchId, ...data },
      include: { _count: { select: { members: true } } },
    });
  }

  async addGroupMember(churchId: string, youthGroupId: string, memberId: string) {
    const group = await this.prisma.youthGroup.findFirst({ where: { id: youthGroupId, churchId } });
    if (!group) throw new NotFoundException('Youth group not found');
    return this.prisma.youthGroupMember.create({
      data: { youthGroupId, memberId },
      include: { member: { select: { firstName: true, lastName: true } } },
    });
  }

  async updateGroup(
    churchId: string,
    groupId: string,
    data: {
      name?: string;
      description?: string;
      minAge?: number;
      maxAge?: number;
      leaderId?: string;
      isActive?: boolean;
    },
  ) {
    const group = await this.prisma.youthGroup.findFirst({ where: { id: groupId, churchId } });
    if (!group) throw new NotFoundException('Youth group not found');
    return this.prisma.youthGroup.update({
      where: { id: groupId },
      data: {
        ...(data.name?.trim() ? { name: data.name.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.minAge !== undefined ? { minAge: data.minAge } : {}),
        ...(data.maxAge !== undefined ? { maxAge: data.maxAge } : {}),
        ...(data.leaderId !== undefined ? { leaderId: data.leaderId } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: { _count: { select: { members: true, events: true, channels: true } } },
    });
  }

  async deleteGroup(churchId: string, groupId: string) {
    const group = await this.prisma.youthGroup.findFirst({ where: { id: groupId, churchId } });
    if (!group) throw new NotFoundException('Youth group not found');
    return this.prisma.youthGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    });
  }

  async removeGroupMember(churchId: string, youthGroupId: string, memberId: string) {
    const group = await this.prisma.youthGroup.findFirst({ where: { id: youthGroupId, churchId } });
    if (!group) throw new NotFoundException('Youth group not found');
    await this.prisma.youthGroupMember.deleteMany({
      where: { youthGroupId, memberId },
    });
    return { removed: true };
  }

  // ─── Resources Hub ────────────────────────────────────────

  listResources(churchId: string, category?: YouthResourceCategory, youthGroupId?: string) {
    return this.prisma.youthResource.findMany({
      where: {
        churchId,
        isPublished: true,
        ...(category ? { category } : {}),
        ...(youthGroupId ? { OR: [{ youthGroupId }, { youthGroupId: null }] } : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  createResource(
    churchId: string,
    data: {
      title: string;
      description?: string;
      category?: YouthResourceCategory;
      url?: string;
      content?: string;
      youthGroupId?: string;
    },
  ) {
    return this.prisma.youthResource.create({
      data: {
        churchId,
        title: data.title,
        description: data.description,
        category: data.category ?? 'GUIDE',
        url: data.url,
        content: data.content,
        youthGroupId: data.youthGroupId,
      },
    });
  }

  async updateResource(
    churchId: string,
    resourceId: string,
    data: {
      title?: string;
      description?: string;
      category?: YouthResourceCategory;
      url?: string;
      content?: string;
      isPublished?: boolean;
    },
  ) {
    const existing = await this.prisma.youthResource.findFirst({
      where: { id: resourceId, churchId },
    });
    if (!existing) throw new NotFoundException('Resource not found');
    return this.prisma.youthResource.update({
      where: { id: resourceId },
      data: {
        ...(data.title?.trim() ? { title: data.title.trim() } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.url !== undefined ? { url: data.url } : {}),
        ...(data.content !== undefined ? { content: data.content } : {}),
        ...(data.isPublished !== undefined ? { isPublished: data.isPublished } : {}),
      },
    });
  }

  async deleteResource(churchId: string, resourceId: string) {
    const existing = await this.prisma.youthResource.findFirst({
      where: { id: resourceId, churchId },
    });
    if (!existing) throw new NotFoundException('Resource not found');
    return this.prisma.youthResource.update({
      where: { id: resourceId },
      data: { isPublished: false },
    });
  }

  // ─── Help Zone ────────────────────────────────────────────

  listHelpRequests(churchId: string, status?: HelpRequestStatus) {
    return this.prisma.youthHelpRequest.findMany({
      where: {
        churchId,
        ...(status ? { status } : {}),
      },
      include: {
        responses: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { firstName: true, lastName: true } } },
        },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submitHelpRequest(
    churchId: string,
    data: {
      message: string;
      category?: HelpRequestCategory;
      isAnonymous?: boolean;
      memberId?: string;
      alias?: string;
    },
  ) {
    if (!data.message?.trim()) throw new BadRequestException('Message is required');
    return this.prisma.youthHelpRequest.create({
      data: {
        churchId,
        message: data.message.trim(),
        category: data.category ?? 'OTHER',
        isAnonymous: data.isAnonymous !== false,
        memberId: data.isAnonymous ? undefined : data.memberId,
        alias: data.isAnonymous ? data.alias ?? 'Anonymous' : undefined,
      },
    });
  }

  async assignHelpRequest(churchId: string, id: string, assignedToId: string) {
    const req = await this.prisma.youthHelpRequest.findFirst({ where: { id, churchId } });
    if (!req) throw new NotFoundException('Help request not found');
    return this.prisma.youthHelpRequest.update({
      where: { id },
      data: { assignedToId, status: 'ASSIGNED' },
    });
  }

  async respondToHelp(
    churchId: string,
    requestId: string,
    authorId: string,
    body: string,
    isInternal = false,
  ) {
    const req = await this.prisma.youthHelpRequest.findFirst({ where: { id: requestId, churchId } });
    if (!req) throw new NotFoundException('Help request not found');
    await this.prisma.youthHelpResponse.create({
      data: { requestId, authorId, body, isInternal },
    });
    return this.prisma.youthHelpRequest.update({
      where: { id: requestId },
      data: { status: isInternal ? req.status : 'IN_PROGRESS' },
      include: { responses: true },
    });
  }

  async resolveHelpRequest(churchId: string, id: string) {
    const existing = await this.prisma.youthHelpRequest.findFirst({ where: { id, churchId } });
    if (!existing) throw new NotFoundException('Help request not found');
    const req = await this.prisma.youthHelpRequest.update({
      where: { id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    if (req.memberId) {
      await this.gamification.scoreEvent(churchId, req.memberId, YouthPointSource.SERVE, {
        delta: 15,
        reason: 'Help request resolved',
      });
    }
    return req;
  }

  // ─── Parent / guardian ────────────────────────────────────

  listParentLinks(churchId: string) {
    return this.prisma.parentGuardianLink.findMany({
      where: {
        parent: { churchId },
        child: { churchId },
      },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            youthMemberships: { include: { youthGroup: { select: { name: true } } } },
            gamification: true,
          },
        },
      },
    });
  }

  async linkParent(churchId: string, parentId: string, childId: string, relation = 'PARENT') {
    const [parent, child] = await Promise.all([
      this.prisma.member.findFirst({ where: { id: parentId, churchId } }),
      this.prisma.member.findFirst({ where: { id: childId, churchId } }),
    ]);
    if (!parent || !child) throw new NotFoundException('Parent or child not found');
    return this.prisma.parentGuardianLink.upsert({
      where: { parentId_childId: { parentId, childId } },
      create: { parentId, childId, relation },
      update: { relation },
      include: {
        parent: { select: { firstName: true, lastName: true } },
        child: { select: { firstName: true, lastName: true } },
      },
    });
  }

  listMembersForYouth(churchId: string) {
    return this.prisma.member.findMany({
      where: { churchId, roles: { has: 'YOUTH' } },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { firstName: 'asc' },
    });
  }

  // ─── Youth Hub administrators ─────────────────────────────

  async listHubAdmins(churchId: string) {
    const users = await this.prisma.user.findMany({
      where: { churchId, isActive: true },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        roles: { include: { role: { select: { name: true } } } },
        member: { select: { id: true } },
      },
    });

    return users.map((u) => {
      const roleNames = u.roles.map((r) => r.role.name);
      return {
        userId: u.id,
        email: u.email,
        name: `${u.firstName} ${u.lastName}`.trim(),
        memberId: u.member?.id ?? null,
        roleNames,
        isYouthHubLeader: roleNames.some((n) =>
          (YOUTH_HUB_LEADER_ROLES as readonly string[]).includes(n),
        ),
        isYouthAdmin: roleNames.includes('YOUTH_ADMIN'),
      };
    });
  }

  async setYouthAdmin(churchId: string, targetUserId: string, enabled: boolean) {
    const user = await this.prisma.user.findFirst({
      where: { id: targetUserId, churchId, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found in this church');

    const role = await this.prisma.role.findUnique({ where: { name: 'YOUTH_ADMIN' } });
    if (!role) {
      throw new BadRequestException(
        'YOUTH_ADMIN role is missing — re-run database seed',
      );
    }

    if (enabled) {
      await this.prisma.userRole.upsert({
        where: { userId_roleId: { userId: targetUserId, roleId: role.id } },
        create: { userId: targetUserId, roleId: role.id },
        update: {},
      });
      return { userId: targetUserId, isYouthAdmin: true };
    }

    await this.prisma.userRole.deleteMany({
      where: { userId: targetUserId, roleId: role.id },
    });
    return { userId: targetUserId, isYouthAdmin: false };
  }

  async assertYouthHubLeader(userId: string) {
    const userRoles = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    const ok = userRoles.some((r) =>
      (YOUTH_HUB_LEADER_ROLES as readonly string[]).includes(r.role.name),
    );
    if (!ok) throw new ForbiddenException('Youth Hub leader access required');
  }
}
