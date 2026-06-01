import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DevotionalGroupMemberRole, DevotionalGroupVisibility, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.module';
import { EmailAdapter } from '../../notifications/adapters/email.adapter';
import {
  CreateDevotionalGroupDto,
  InviteToGroupDto,
  UpdateDevotionalGroupDto,
} from '../dto/create-group.dto';

const ADMIN_ROLES: DevotionalGroupMemberRole[] = ['ADMIN', 'CO_ADMIN'];

@Injectable()
export class DevotionalGroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailAdapter,
  ) {}

  private token() {
    return randomBytes(24).toString('hex');
  }

  private async resolveMember(churchId: string, userId: string) {
    const member = await this.prisma.member.findFirst({
      where: { churchId, userId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    });
    if (!member) throw new BadRequestException('Member profile required');
    return member;
  }

  private async friendMemberIds(churchId: string, memberId: string) {
    const memberships = await this.prisma.youthGroupMember.findMany({
      where: { memberId, youthGroup: { churchId } },
      select: { youthGroupId: true },
    });
    const groupIds = memberships.map((m) => m.youthGroupId);
    if (!groupIds.length) return new Set<string>();

    const peers = await this.prisma.youthGroupMember.findMany({
      where: { youthGroupId: { in: groupIds }, memberId: { not: memberId } },
      select: { memberId: true },
    });
    return new Set(peers.map((p) => p.memberId));
  }

  private async membership(groupId: string, memberId: string) {
    return this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
  }

  private async assertAdmin(groupId: string, memberId: string) {
    const m = await this.membership(groupId, memberId);
    if (!m || m.status !== 'ACTIVE' || !ADMIN_ROLES.includes(m.role)) {
      throw new ForbiddenException('Admin or co-admin access required');
    }
    return m;
  }

  private isInviteLinkValid(group: {
    inviteToken: string | null;
    inviteExpiresAt: Date | null;
    visibility: DevotionalGroupVisibility;
  }) {
    if (group.visibility !== 'INVITE_LINK' || !group.inviteToken) return false;
    if (group.inviteExpiresAt && group.inviteExpiresAt < new Date()) return false;
    return true;
  }

  private groupInclude() {
    return {
      plan: { select: { id: true, title: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      _count: { select: { members: { where: { status: 'ACTIVE' } } } },
      members: {
        where: { status: 'ACTIVE' },
        take: 8,
        include: {
          member: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    } satisfies Prisma.DevotionalGroupInclude;
  }

  async listForUser(churchId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const friendIds = await this.friendMemberIds(churchId, member.id);

    const myMemberships = await this.prisma.devotionalGroupMember.findMany({
      where: { memberId: member.id, status: { in: ['ACTIVE', 'PENDING'] } },
      select: { groupId: true, role: true, status: true },
    });
    const myGroupIds = myMemberships.map((m) => m.groupId);

    const discoverable = await this.prisma.devotionalGroup.findMany({
      where: {
        churchId,
        isActive: true,
        id: { notIn: myGroupIds },
        OR: [
          { visibility: 'FRIENDS_ONLY', members: { some: { memberId: { in: [...friendIds] } } } },
          {
            visibility: 'INVITE_LINK',
            inviteToken: { not: null },
            OR: [{ inviteExpiresAt: null }, { inviteExpiresAt: { gt: new Date() } }],
          },
        ],
      },
      include: this.groupInclude(),
      take: 30,
    });

    const mine = await this.prisma.devotionalGroup.findMany({
      where: { churchId, isActive: true, id: { in: myGroupIds } },
      include: this.groupInclude(),
      orderBy: { updatedAt: 'desc' },
    });

    const membershipMap = Object.fromEntries(
      myMemberships.map((m) => [m.groupId, { role: m.role, status: m.status }]),
    );

    return {
      myGroups: mine.map((g) => ({ ...g, myMembership: membershipMap[g.id] })),
      discoverable,
      pendingInvites: await this.myPendingInvites(churchId, member.id),
    };
  }

  async myPendingInvites(churchId: string, memberId: string) {
    return this.prisma.devotionalGroupInvite.findMany({
      where: {
        churchId,
        invitedMemberId: memberId,
        status: 'PENDING',
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { group: { select: { id: true, name: true, profileImageUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOne(churchId: string, groupId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const group = await this.prisma.devotionalGroup.findFirst({
      where: { id: groupId, churchId, isActive: true },
      include: {
        ...this.groupInclude(),
        members: {
          include: {
            member: {
              select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true },
            },
          },
          orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
        },
        invites: {
          where: { status: 'PENDING' },
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!group) throw new NotFoundException('Group not found');

    const myMembership = await this.membership(groupId, member.id);
    const friendIds = await this.friendMemberIds(churchId, member.id);
    const canView =
      (myMembership && myMembership.status !== 'DECLINED') ||
      group.visibility === 'INVITE_LINK' ||
      (group.visibility === 'FRIENDS_ONLY' &&
        group.members.some(
          (m) => m.status === 'ACTIVE' && friendIds.has(m.memberId),
        ));

    if (!canView) throw new ForbiddenException('You cannot view this group');

    const isAdmin =
      myMembership?.status === 'ACTIVE' && ADMIN_ROLES.includes(myMembership.role);

    return {
      ...group,
      myMembership,
      isAdmin,
      inviteLinkValid: this.isInviteLinkValid(group),
      timeline: await this.buildTimeline(churchId, groupId, isAdmin),
      pendingMembers: isAdmin
        ? group.members.filter((m) => m.status === 'PENDING')
        : [],
    };
  }

  async buildTimeline(churchId: string, groupId: string, includePrivate = false) {
    const [discussions, journals, meetups, prayers] = await Promise.all([
      this.prisma.devotionalDiscussion.findMany({
        where: { churchId, groupId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          member: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.devotionalJournalEntry.findMany({
        where: {
          churchId,
          groupId,
          ...(includePrivate ? {} : { visibility: 'GROUP' }),
        },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.devotionalMeetup.findMany({
        where: {
          churchId,
          groupId,
          OR: [
            { status: 'SCHEDULED', startsAt: { gte: new Date() } },
            { status: 'COMPLETED' },
          ],
        },
        orderBy: { startsAt: 'desc' },
        take: 10,
      }),
      this.prisma.devotionalPrayerList.findMany({
        where: { churchId, groupId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: { items: { take: 3, orderBy: { sortOrder: 'asc' } } },
      }),
    ]);

    type TimelineItem = {
      id: string;
      type: string;
      title: string;
      body?: string;
      at: string;
      meta?: Record<string, unknown>;
    };

    const items: TimelineItem[] = [];

    for (const d of discussions) {
      items.push({
        id: d.id,
        type: 'discussion',
        title: d.title ?? 'Discussion',
        body: d.body.slice(0, 200),
        at: d.createdAt.toISOString(),
        meta: { author: `${d.member.firstName} ${d.member.lastName}` },
      });
    }
    for (const j of journals) {
      items.push({
        id: j.id,
        type: 'journal',
        title: j.title ?? 'Journal entry',
        body: j.body.slice(0, 200),
        at: j.createdAt.toISOString(),
        meta: { author: `${j.member.firstName} ${j.member.lastName}` },
      });
    }
    for (const m of meetups) {
      items.push({
        id: m.id,
        type: 'meetup',
        title: m.title,
        body: m.description ?? undefined,
        at: m.startsAt.toISOString(),
        meta: {
          location: m.location,
          onlineLink: m.onlineLink,
          status: m.status,
          needsFollowUp:
            m.status === 'COMPLETED' &&
            !m.postEventCompletedAt &&
            m.startsAt < new Date(),
        },
      });
    }
    for (const p of prayers) {
      items.push({
        id: p.id,
        type: 'prayer',
        title: p.title,
        body: p.items.map((i) => i.body).join(' · ').slice(0, 200),
        at: p.updatedAt.toISOString(),
      });
    }

    items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return items.slice(0, 25);
  }

  async create(churchId: string, userId: string, dto: CreateDevotionalGroupDto) {
    const member = await this.resolveMember(churchId, userId);
    const inviteToken = this.token();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const group = await this.prisma.devotionalGroup.create({
      data: {
        churchId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        profileImageUrl: dto.profileImageUrl?.trim(),
        visibility: dto.visibility ?? 'INVITE_LINK',
        planId: dto.planId,
        createdById: member.id,
        leaderId: member.id,
        inviteToken,
        inviteExpiresAt: expiresAt,
        members: {
          create: {
            memberId: member.id,
            role: 'ADMIN',
            status: 'ACTIVE',
          },
        },
      },
      include: this.groupInclude(),
    });

    return group;
  }

  async update(
    churchId: string,
    groupId: string,
    userId: string,
    dto: UpdateDevotionalGroupDto,
  ) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertAdmin(groupId, member.id);

    return this.prisma.devotionalGroup.update({
      where: { id: groupId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.profileImageUrl !== undefined ? { profileImageUrl: dto.profileImageUrl } : {}),
        ...(dto.visibility ? { visibility: dto.visibility } : {}),
        ...(dto.planId !== undefined ? { planId: dto.planId } : {}),
      },
      include: this.groupInclude(),
    });
  }

  async regenerateInviteLink(
    churchId: string,
    groupId: string,
    userId: string,
    expiresInDays = 30,
  ) {
    const member = await this.resolveMember(churchId, userId);
    await this.assertAdmin(groupId, member.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    return this.prisma.devotionalGroup.update({
      where: { id: groupId, churchId },
      data: {
        inviteToken: this.token(),
        inviteExpiresAt: expiresAt,
        visibility: 'INVITE_LINK',
      },
      select: { id: true, inviteToken: true, inviteExpiresAt: true },
    });
  }

  private async findInvitee(
    churchId: string,
    dto: InviteToGroupDto,
  ): Promise<{ memberId?: string; email?: string; phone?: string; userEmail?: string }> {
    const normalizedEmail = dto.inviteeEmail?.trim().toLowerCase();
    const userEmail = dto.inviteeUserEmail?.trim().toLowerCase();
    const phone = dto.inviteePhone?.trim();

    if (userEmail) {
      const user = await this.prisma.user.findFirst({
        where: { churchId, email: { equals: userEmail, mode: 'insensitive' } },
        include: { member: true },
      });
      if (user?.member) return { memberId: user.member.id, userEmail };
    }

    if (normalizedEmail) {
      const m = await this.prisma.member.findFirst({
        where: {
          churchId,
          OR: [
            { email: { equals: normalizedEmail, mode: 'insensitive' } },
            { user: { email: { equals: normalizedEmail, mode: 'insensitive' } } },
          ],
        },
      });
      if (m) return { memberId: m.id, email: normalizedEmail };
      return { email: normalizedEmail };
    }

    if (phone) {
      const m = await this.prisma.member.findFirst({
        where: { churchId, phone: { contains: phone.replace(/\D/g, '').slice(-10) } },
      });
      if (m) return { memberId: m.id, phone };
      return { phone };
    }

    throw new BadRequestException('Provide inviteeUserEmail, inviteeEmail, or inviteePhone');
  }

  async sendInvite(
    churchId: string,
    groupId: string,
    userId: string,
    dto: InviteToGroupDto,
  ) {
    const inviter = await this.resolveMember(churchId, userId);
    await this.assertAdmin(groupId, inviter.id);

    const group = await this.prisma.devotionalGroup.findFirst({
      where: { id: groupId, churchId },
    });
    if (!group) throw new NotFoundException('Group not found');

    const target = await this.findInvitee(churchId, dto);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays ?? 14));

    const invite = await this.prisma.devotionalGroupInvite.create({
      data: {
        churchId,
        groupId,
        inviteeEmail: target.email,
        inviteePhone: target.phone,
        inviteeUserEmail: target.userEmail,
        invitedMemberId: target.memberId,
        inviteToken: this.token(),
        invitedById: inviter.id,
        expiresAt,
      },
    });

    if (target.memberId) {
      await this.prisma.devotionalGroupMember.upsert({
        where: { groupId_memberId: { groupId, memberId: target.memberId } },
        create: {
          groupId,
          memberId: target.memberId,
          role: 'MEMBER',
          status: 'PENDING',
          invitedById: inviter.id,
        },
        update: { status: 'PENDING', invitedById: inviter.id },
      });
    }

    const notifyEmail =
      target.email ??
      target.userEmail ??
      (target.memberId
        ? (
            await this.prisma.member.findUnique({
              where: { id: target.memberId },
              include: { user: { select: { email: true } } },
            })
          )?.user?.email ?? undefined
        : undefined);

    if (notifyEmail) {
      await this.email.send({
        to: notifyEmail,
        subject: `Invitation to ${group.name} — Devotional Hub`,
        body: `You've been invited to join "${group.name}" on Church Hub Devotional Hub. Open the app to accept.`,
        churchId,
      });
    }

    return invite;
  }

  async joinViaGroupLink(churchId: string, userId: string, token: string) {
    const member = await this.resolveMember(churchId, userId);
    const group = await this.prisma.devotionalGroup.findFirst({
      where: { churchId, inviteToken: token, isActive: true },
    });
    if (!group || !this.isInviteLinkValid(group)) {
      throw new BadRequestException('Invite link is invalid or expired');
    }

    const status = group.visibility === 'INVITE_LINK' ? 'ACTIVE' : 'PENDING';

    return this.prisma.devotionalGroupMember.upsert({
      where: { groupId_memberId: { groupId: group.id, memberId: member.id } },
      create: {
        groupId: group.id,
        memberId: member.id,
        role: 'MEMBER',
        status,
      },
      update: { status },
    });
  }

  async acceptInvite(churchId: string, userId: string, inviteId: string) {
    const member = await this.resolveMember(churchId, userId);
    const invite = await this.prisma.devotionalGroupInvite.findFirst({
      where: {
        id: inviteId,
        churchId,
        status: 'PENDING',
        OR: [{ invitedMemberId: member.id }, { invitedMemberId: null }],
      },
    });
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.expiresAt && invite.expiresAt < new Date()) {
      await this.prisma.devotionalGroupInvite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invite expired');
    }

    await this.prisma.devotionalGroupInvite.update({
      where: { id: inviteId },
      data: { status: 'ACCEPTED', respondedAt: new Date(), invitedMemberId: member.id },
    });

    return this.prisma.devotionalGroupMember.upsert({
      where: { groupId_memberId: { groupId: invite.groupId, memberId: member.id } },
      create: {
        groupId: invite.groupId,
        memberId: member.id,
        role: 'MEMBER',
        status: 'ACTIVE',
        invitedById: invite.invitedById,
      },
      update: { status: 'ACTIVE' },
    });
  }

  async declineInvite(churchId: string, userId: string, inviteId: string) {
    const member = await this.resolveMember(churchId, userId);
    const invite = await this.prisma.devotionalGroupInvite.findFirst({
      where: { id: inviteId, churchId, invitedMemberId: member.id, status: 'PENDING' },
    });
    if (!invite) throw new NotFoundException('Invite not found');

    await this.prisma.devotionalGroupInvite.update({
      where: { id: inviteId },
      data: { status: 'DECLINED', respondedAt: new Date() },
    });

    await this.prisma.devotionalGroupMember.updateMany({
      where: { groupId: invite.groupId, memberId: member.id },
      data: { status: 'DECLINED' },
    });

    return { ok: true };
  }

  async approveMember(
    churchId: string,
    groupId: string,
    userId: string,
    targetMemberId: string,
  ) {
    const admin = await this.resolveMember(churchId, userId);
    await this.assertAdmin(groupId, admin.id);

    const row = await this.prisma.devotionalGroupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId: targetMemberId } },
    });
    if (!row) throw new NotFoundException('Membership not found');

    return this.prisma.devotionalGroupMember.update({
      where: { groupId_memberId: { groupId, memberId: targetMemberId } },
      data: { status: 'ACTIVE' },
    });
  }

  async declineMember(
    churchId: string,
    groupId: string,
    userId: string,
    targetMemberId: string,
  ) {
    const admin = await this.resolveMember(churchId, userId);
    await this.assertAdmin(groupId, admin.id);

    return this.prisma.devotionalGroupMember.update({
      where: { groupId_memberId: { groupId, memberId: targetMemberId } },
      data: { status: 'DECLINED' },
    });
  }

  async setMemberRole(
    churchId: string,
    groupId: string,
    userId: string,
    targetMemberId: string,
    role: DevotionalGroupMemberRole,
  ) {
    const admin = await this.resolveMember(churchId, userId);
    const adminMembership = await this.assertAdmin(groupId, admin.id);
    if (adminMembership.role !== 'ADMIN' && role === 'ADMIN') {
      throw new ForbiddenException('Only the group admin can assign admin role');
    }
    if (role === 'ADMIN') {
      throw new BadRequestException('Transfer admin via separate flow; use CO_ADMIN');
    }

    return this.prisma.devotionalGroupMember.update({
      where: { groupId_memberId: { groupId, memberId: targetMemberId } },
      data: { role },
    });
  }

  async leaveGroup(churchId: string, groupId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const m = await this.membership(groupId, member.id);
    if (!m) throw new NotFoundException('Not a member');

    if (m.role === 'ADMIN') {
      const otherAdmin = await this.prisma.devotionalGroupMember.count({
        where: {
          groupId,
          status: 'ACTIVE',
          role: 'ADMIN',
          memberId: { not: member.id },
        },
      });
      if (otherAdmin === 0) {
        throw new BadRequestException('Promote another admin before leaving');
      }
    }

    await this.prisma.devotionalGroupMember.delete({
      where: { groupId_memberId: { groupId, memberId: member.id } },
    });
    return { ok: true };
  }

  async requestJoin(churchId: string, groupId: string, userId: string) {
    const member = await this.resolveMember(churchId, userId);
    const group = await this.prisma.devotionalGroup.findFirst({
      where: { id: groupId, churchId, isActive: true },
    });
    if (!group) throw new NotFoundException('Group not found');

    if (group.visibility === 'PRIVATE') {
      throw new ForbiddenException('This group is private — request an invite');
    }

    if (group.visibility === 'FRIENDS_ONLY') {
      const friendIds = await this.friendMemberIds(churchId, member.id);
      const hasFriend = await this.prisma.devotionalGroupMember.findFirst({
        where: { groupId, memberId: { in: [...friendIds] }, status: 'ACTIVE' },
      });
      if (!hasFriend) {
        throw new ForbiddenException('Friends-only — connect via youth groups first');
      }
    }

    return this.prisma.devotionalGroupMember.upsert({
      where: { groupId_memberId: { groupId, memberId: member.id } },
      create: { groupId, memberId: member.id, role: 'MEMBER', status: 'PENDING' },
      update: { status: 'PENDING' },
    });
  }

  /** Legacy list — published groups in church */
  list(churchId: string) {
    return this.prisma.devotionalGroup.findMany({
      where: { churchId, isActive: true },
      include: {
        _count: { select: { members: { where: { status: 'ACTIVE' } } } },
        plan: { select: { id: true, title: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async addMember(churchId: string, groupId: string, memberId: string) {
    const group = await this.prisma.devotionalGroup.findFirst({
      where: { id: groupId, churchId },
    });
    if (!group) throw new NotFoundException('Devotional group not found');
    return this.prisma.devotionalGroupMember.upsert({
      where: { groupId_memberId: { groupId, memberId } },
      create: { groupId, memberId, status: 'ACTIVE', role: 'MEMBER' },
      update: { status: 'ACTIVE' },
    });
  }
}
