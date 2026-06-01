import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberRoleType, MemberStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  MEMBER_STATUS_ORDER,
  MINISTRY_INTEREST_OPTIONS,
  ONBOARDING_COMPLETE_STEP,
  ONBOARDING_STEPS,
} from './membership.constants';
import { MembershipActivityService } from './membership-activity.service';

const memberInclude = {
  family: true,
  gamification: { include: { badges: { include: { badge: true } } } },
  parentLinks: {
    include: { child: { select: { id: true, firstName: true, lastName: true, status: true } } },
  },
  childLinks: {
    include: { parent: { select: { id: true, firstName: true, lastName: true, status: true } } },
  },
} satisfies Prisma.MemberInclude;

@Injectable()
export class MembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: MembershipActivityService,
  ) {}

  getCatalog() {
    return {
      statuses: MEMBER_STATUS_ORDER,
      roles: ['YOUTH', 'ADULT', 'LEADER', 'DRIVER', 'EVANGELIST'],
      adminAssignableRoles: ['ADMIN', 'PASTOR'] as MemberRoleType[],
      ministryInterests: [...MINISTRY_INTEREST_OPTIONS],
      onboardingSteps: ONBOARDING_STEPS,
    };
  }

  async getStats(churchId: string) {
    const grouped = await this.prisma.member.groupBy({
      by: ['status'],
      where: { churchId },
      _count: { id: true },
    });

    const byStatus = Object.fromEntries(
      MEMBER_STATUS_ORDER.map((s) => [s, grouped.find((g) => g.status === s)?._count.id ?? 0]),
    ) as Record<MemberStatus, number>;

    const [total, inOnboarding, families] = await Promise.all([
      this.prisma.member.count({ where: { churchId } }),
      this.prisma.member.count({
        where: { churchId, onboardingStep: { gt: 0, lt: ONBOARDING_COMPLETE_STEP } },
      }),
      this.prisma.family.count({ where: { churchId } }),
    ]);

    return { total, inOnboarding, families, byStatus };
  }

  async listMembers(
    churchId: string,
    filters?: { status?: MemberStatus; search?: string; role?: MemberRoleType },
  ) {
    const where: Prisma.MemberWhereInput = { churchId };
    if (filters?.status) where.status = filters.status;
    if (filters?.role) where.roles = { has: filters.role };
    if (filters?.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.member.findMany({
      where,
      include: { family: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async getMember(churchId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, churchId },
      include: memberInclude,
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async createMember(
    churchId: string,
    data: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      roles?: MemberRoleType[];
      status?: MemberStatus;
      familyId?: string;
      ministryInterests?: string[];
      address?: string;
      city?: string;
      notes?: string;
      startOnboarding?: boolean;
      bornAgain?: boolean;
      baptizedInHolySpirit?: boolean;
      userId?: string;
    },
  ) {
    const onboardingStep = data.startOnboarding !== false ? 1 : 0;
    const created = await this.prisma.member.create({
      data: {
        churchId,
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        roles: data.roles ?? ['ADULT'],
        status: data.status ?? 'VISITOR',
        familyId: data.familyId,
        ministryInterests: data.ministryInterests ?? [],
        address: data.address,
        city: data.city,
        notes: data.notes,
        bornAgain: data.bornAgain,
        baptizedInHolySpirit: data.baptizedInHolySpirit,
        onboardingStep,
        gamification: { create: {} },
      },
      include: memberInclude,
    });
    await this.activity.log(
      churchId,
      created.id,
      'MEMBER_CREATED',
      `Member created: ${created.firstName} ${created.lastName}`,
    );
    return created;
  }

  async updateMember(
    churchId: string,
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      status: MemberStatus;
      roles: MemberRoleType[];
      familyId: string | null;
      ministryInterests: string[];
      onboardingStep: number;
      address: string;
      city: string;
      notes: string;
    }>,
    actorUserId?: string,
  ) {
    await this.getMember(churchId, id);
    const { dateOfBirth, ...rest } = data;
    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      },
      include: memberInclude,
    });
    await this.activity.log(churchId, id, 'MEMBER_UPDATED', 'Profile updated', { actorUserId });
    return updated;
  }

  async advanceStatus(churchId: string, id: string, actorUserId?: string) {
    const member = await this.getMember(churchId, id);
    const idx = MEMBER_STATUS_ORDER.indexOf(member.status);
    if (idx < 0 || idx >= MEMBER_STATUS_ORDER.length - 1) {
      throw new BadRequestException('Member is already at the highest lifecycle stage');
    }
    const next = MEMBER_STATUS_ORDER[idx + 1];
    const updated = await this.prisma.member.update({
      where: { id },
      data: { status: next },
      include: memberInclude,
    });
    await this.activity.log(churchId, id, 'STATUS_CHANGED', `${member.status} → ${next}`, {
      actorUserId,
      metadata: { from: member.status, to: next },
    });
    return updated;
  }

  async setStatus(churchId: string, id: string, status: MemberStatus, actorUserId?: string) {
    const member = await this.getMember(churchId, id);
    const updated = await this.prisma.member.update({
      where: { id },
      data: { status },
      include: memberInclude,
    });
    if (member.status !== status) {
      await this.activity.log(churchId, id, 'STATUS_CHANGED', `${member.status} → ${status}`, {
        actorUserId,
        metadata: { from: member.status, to: status },
      });
    }
    return updated;
  }

  async saveOnboardingStep(
    churchId: string,
    id: string,
    step: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      dateOfBirth: string;
      address: string;
      city: string;
      roles: MemberRoleType[];
      ministryInterests: string[];
      familyId: string;
      notes: string;
    }>,
  ) {
    const member = await this.getMember(churchId, id);
    if (step < 1 || step > ONBOARDING_STEPS.length) {
      throw new BadRequestException('Invalid onboarding step');
    }
    const nextStep = Math.max(member.onboardingStep, step);
    const { dateOfBirth, ...rest } = data;
    return this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        onboardingStep: nextStep,
      },
      include: memberInclude,
    });
  }

  async completeOnboarding(churchId: string, id: string, actorUserId?: string) {
    const member = await this.getMember(churchId, id);
    if (member.onboardingStep < ONBOARDING_STEPS.length) {
      throw new BadRequestException('Complete all onboarding steps first');
    }
    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        onboardingStep: ONBOARDING_COMPLETE_STEP,
        status: member.status === 'VISITOR' ? 'NEW_MEMBER' : member.status,
      },
      include: memberInclude,
    });
    await this.activity.log(churchId, id, 'ONBOARDING_COMPLETED', 'Onboarding completed', {
      actorUserId,
    });
    return updated;
  }

  async listFamilies(churchId: string) {
    return this.prisma.family.findMany({
      where: { churchId },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            roles: true,
          },
          orderBy: { firstName: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getFamily(churchId: string, familyId: string) {
    const family = await this.prisma.family.findFirst({
      where: { id: familyId, churchId },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            status: true,
            roles: true,
            email: true,
            phone: true,
          },
          orderBy: { firstName: 'asc' },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async updateFamily(
    churchId: string,
    familyId: string,
    data: { name?: string; headMemberId?: string | null },
  ) {
    await this.getFamily(churchId, familyId);
    return this.prisma.family.update({
      where: { id: familyId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.headMemberId !== undefined ? { headMemberId: data.headMemberId } : {}),
      },
      include: { members: true },
    });
  }

  async createFamily(
    churchId: string,
    name: string,
    headMemberId?: string,
    actorUserId?: string,
  ) {
    const family = await this.prisma.family.create({
      data: { churchId, name, headMemberId },
      include: { members: true },
    });
    if (headMemberId) {
      await this.prisma.member.updateMany({
        where: { id: headMemberId, churchId },
        data: { familyId: family.id },
      });
      await this.activity.log(churchId, headMemberId, 'FAMILY_CREATED', `Family created: ${name}`, {
        actorUserId,
        metadata: { familyId: family.id },
      });
    }
    return this.getFamily(churchId, family.id);
  }

  async linkFamilyMember(
    churchId: string,
    memberId: string,
    familyId: string,
    actorUserId?: string,
  ) {
    const family = await this.prisma.family.findFirst({ where: { id: familyId, churchId } });
    if (!family) throw new NotFoundException('Family not found');
    await this.getMember(churchId, memberId);
    const updated = await this.prisma.member.update({
      where: { id: memberId },
      data: { familyId },
      include: memberInclude,
    });
    await this.activity.log(churchId, memberId, 'FAMILY_LINKED', `Joined family ${family.name}`, {
      actorUserId,
      metadata: { familyId },
    });
    return updated;
  }

  async linkParentGuardian(
    churchId: string,
    parentId: string,
    childId: string,
    relation = 'PARENT',
    actorUserId?: string,
  ) {
    if (parentId === childId) throw new BadRequestException('Cannot link member to themselves');
    await this.getMember(churchId, parentId);
    await this.getMember(churchId, childId);

    const existing = await this.prisma.parentGuardianLink.findUnique({
      where: { parentId_childId: { parentId, childId } },
    });
    if (existing) return existing;

    const link = await this.prisma.parentGuardianLink.create({
      data: { parentId, childId, relation },
    });
    await this.activity.log(churchId, parentId, 'GUARDIAN_LINKED', `Guardian link to member`, {
      actorUserId,
      metadata: { childId, relation },
    });
    return link;
  }

  async removeParentGuardianLink(
    churchId: string,
    parentId: string,
    childId: string,
    actorUserId?: string,
  ) {
    const parent = await this.prisma.member.findFirst({ where: { id: parentId, churchId } });
    if (!parent) throw new NotFoundException('Parent member not found');
    await this.prisma.parentGuardianLink.deleteMany({
      where: { parentId, childId },
    });
    await this.activity.log(churchId, parentId, 'GUARDIAN_REMOVED', 'Guardian link removed', {
      actorUserId,
      metadata: { childId },
    });
    return { success: true };
  }

  async deleteMember(churchId: string, id: string, actorUserId?: string) {
    const member = await this.getMember(churchId, id);
    await this.activity.log(
      churchId,
      id,
      'MEMBER_DELETED',
      `Member removed: ${member.firstName} ${member.lastName}`,
      { actorUserId },
    );
    await this.prisma.$transaction([
      this.prisma.followUp.updateMany({
        where: { churchId, memberId: id },
        data: { memberId: null },
      }),
      this.prisma.member.delete({ where: { id } }),
    ]);
    return { success: true };
  }
}
