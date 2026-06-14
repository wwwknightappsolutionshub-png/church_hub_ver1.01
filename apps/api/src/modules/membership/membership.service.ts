import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MemberGender, MemberRoleType, MemberStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import type { PaginatedResult } from '../devotional-hub/dto/pagination.dto';
import { weekStartUtc } from '../service-units/service-units-department.util';
import {
  MEMBER_STATUS_ORDER,
  MINISTRY_INTEREST_OPTIONS,
  ONBOARDING_COMPLETE_STEP,
  ONBOARDING_STEPS,
} from './membership.constants';
import { MembershipActivityService } from './membership-activity.service';
import { MembershipRegistryService } from './membership-registry.service';

const memberInclude = {
  family: true,
  classification: true,
  familyRole: true,
  customFieldValues: { include: { definition: true } },
  propertyAssignments: { include: { definition: true } },
  serviceUnitMemberships: { select: { serviceUnitId: true } },
  cellBranchMembership: { select: { branchId: true } },
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
    private readonly registry: MembershipRegistryService,
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
    await this.registry.ensureRegistryDefaults(churchId);
    const grouped = await this.prisma.member.groupBy({
      by: ['status'],
      where: { churchId },
      _count: { id: true },
    });

    const byStatus = Object.fromEntries(
      MEMBER_STATUS_ORDER.map((s) => [s, grouped.find((g) => g.status === s)?._count.id ?? 0]),
    ) as Record<MemberStatus, number>;

    const [total, inOnboarding, families, churchUnits, childrenChurch] = await Promise.all([
      this.prisma.member.count({ where: { churchId } }),
      this.prisma.member.count({
        where: { churchId, onboardingStep: { gt: 0, lt: ONBOARDING_COMPLETE_STEP } },
      }),
      this.prisma.family.count({ where: { churchId, isActive: true } }),
      this.registry.countChurchUnits(churchId),
      this.registry.countChildrenChurch(churchId),
    ]);

    return {
      total,
      inOnboarding,
      families,
      churchUnits,
      congregants: total,
      childrenChurch,
      byStatus,
    };
  }

  async listMembers(
    churchId: string,
    filters?: { status?: MemberStatus; search?: string; role?: MemberRoleType },
  ) {
    const where = this.buildMemberWhere(churchId, filters);
    return this.prisma.member.findMany({
      where,
      include: { family: { select: { id: true, name: true } } },
      orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  async listMembersPaginated(
    churchId: string,
    filters: {
      status?: MemberStatus;
      search?: string;
      role?: MemberRoleType;
      page: number;
      limit: number;
    },
  ): Promise<PaginatedResult<Prisma.MemberGetPayload<{ include: { family: { select: { id: true; name: true } } } }>>> {
    const page = Math.max(1, filters.page);
    const limit = Math.min(100, Math.max(1, filters.limit));
    const where = this.buildMemberWhere(churchId, filters);
    const [total, items] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.findMany({
        where,
        include: { family: { select: { id: true, name: true } } },
        orderBy: [{ status: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      items,
      page,
      limit,
      total,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      nextCursor: null,
    };
  }

  private buildMemberWhere(
    churchId: string,
    filters?: { status?: MemberStatus; search?: string; role?: MemberRoleType },
  ): Prisma.MemberWhereInput {
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
    return where;
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
      title?: string;
      middleName?: string;
      suffix?: string;
      gender?: MemberGender | string;
      workEmail?: string;
      homePhone?: string;
      workPhone?: string;
      cellPhone?: string;
      hideAge?: boolean;
      membershipDate?: string;
      friendDate?: string;
      classificationId?: string | null;
      familyRoleId?: string | null;
      address2?: string;
      state?: string;
      zip?: string;
      country?: string;
      facebook?: string;
      twitter?: string;
      linkedIn?: string;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
      createFamily?: boolean;
      specialOccasion?: string;
      specialOccasionDate?: string;
      serviceUnitIds?: string[];
      cellBranchId?: string | null;
      requireContactFields?: boolean;
    },
  ) {
    this.registry.validateCongregantPayload(data);
    await this.registry.ensureRegistryDefaults(churchId);

    let familyId = data.familyId;
    if (data.createFamily) {
      const family = await this.prisma.family.create({
        data: {
          churchId,
          name: data.lastName.trim(),
          address: data.address,
          address2: data.address2,
          city: data.city,
          state: data.state,
          zip: data.zip,
          country: data.country,
          homePhone: data.homePhone ?? data.phone,
          email: data.email,
        },
      });
      familyId = family.id;
    }

    const onboardingStep = data.startOnboarding !== false ? 1 : 0;
    const created = await this.prisma.member.create({
      data: {
        churchId,
        userId: data.userId,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        title: data.title?.trim() || null,
        middleName: data.middleName?.trim() || null,
        suffix: data.suffix?.trim() || null,
        gender: this.registry.parseGender(data.gender),
        email: data.email?.trim() || null,
        workEmail: data.workEmail?.trim() || null,
        phone: data.phone?.trim() || data.cellPhone?.trim() || null,
        homePhone: data.homePhone?.trim() || null,
        workPhone: data.workPhone?.trim() || null,
        cellPhone: data.cellPhone?.trim() || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        hideAge: data.hideAge ?? false,
        membershipDate: data.membershipDate ? new Date(data.membershipDate) : undefined,
        friendDate: data.friendDate ? new Date(data.friendDate) : undefined,
        roles: data.roles ?? ['ADULT'],
        status: data.status ?? 'VISITOR',
        familyId: familyId ?? undefined,
        classificationId: data.classificationId ?? undefined,
        familyRoleId: data.familyId || familyId ? (data.familyRoleId ?? undefined) : undefined,
        ministryInterests: data.ministryInterests ?? [],
        address: data.address,
        address2: data.address2,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        facebook: data.facebook?.trim() || null,
        twitter: data.twitter?.trim() || null,
        linkedIn: data.linkedIn?.trim() || null,
        notes: data.notes,
        specialOccasion: data.specialOccasion?.trim() || null,
        specialOccasionDate: data.specialOccasionDate
          ? new Date(data.specialOccasionDate)
          : undefined,
        bornAgain: data.bornAgain,
        baptizedInHolySpirit: data.baptizedInHolySpirit,
        onboardingStep,
        gamification: { create: {} },
      },
      include: memberInclude,
    });

    if (data.customFields) {
      await this.registry.syncMemberCustomFields(churchId, created.id, data.customFields);
    }
    if (data.propertyIds) {
      await this.registry.syncMemberProperties(churchId, created.id, data.propertyIds);
    }
    if (data.serviceUnitIds !== undefined || data.cellBranchId !== undefined) {
      await this.registry.syncCongregantServiceGroups(churchId, created.id, {
        serviceUnitIds: data.serviceUnitIds,
        cellBranchId: data.cellBranchId,
      });
    }

    await this.activity.log(
      churchId,
      created.id,
      'MEMBER_CREATED',
      `Congregant created: ${created.firstName} ${created.lastName}`,
    );
    return this.getMember(churchId, created.id);
  }

  async updateMember(
    churchId: string,
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      title: string;
      middleName: string;
      suffix: string;
      gender: MemberGender | string;
      email: string;
      workEmail: string;
      phone: string;
      homePhone: string;
      workPhone: string;
      cellPhone: string;
      dateOfBirth: string;
      hideAge: boolean;
      membershipDate: string | null;
      friendDate: string | null;
      status: MemberStatus;
      roles: MemberRoleType[];
      familyId: string | null;
      classificationId: string | null;
      familyRoleId: string | null;
      ministryInterests: string[];
      onboardingStep: number;
      address: string;
      address2: string;
      city: string;
      state: string;
      zip: string;
      country: string;
      facebook: string;
      twitter: string;
      linkedIn: string;
      notes: string;
      specialOccasion: string | null;
      specialOccasionDate: string | null;
      customFields: Record<string, string | boolean | null>;
      propertyIds: string[];
      serviceUnitIds?: string[];
      cellBranchId?: string | null;
      requireContactFields?: boolean;
    }>,
    actorUserId?: string,
  ) {
    await this.getMember(churchId, id);
    if (data.requireContactFields) {
      const existing = await this.prisma.member.findFirst({
        where: { id, churchId },
        select: {
          firstName: true,
          lastName: true,
          email: true,
          homePhone: true,
          cellPhone: true,
          phone: true,
          address: true,
          zip: true,
        },
      });
      this.registry.validateCongregantPayload({
        firstName: data.firstName ?? existing?.firstName,
        lastName: data.lastName ?? existing?.lastName,
        email: data.email ?? existing?.email ?? undefined,
        homePhone: data.homePhone ?? existing?.homePhone ?? undefined,
        cellPhone: data.cellPhone ?? existing?.cellPhone ?? undefined,
        phone: data.phone ?? existing?.phone ?? undefined,
        address: data.address ?? existing?.address ?? undefined,
        zip: data.zip ?? existing?.zip ?? undefined,
        requireContactFields: true,
      });
    }
    const {
      dateOfBirth,
      membershipDate,
      friendDate,
      customFields,
      propertyIds,
      gender,
      specialOccasionDate,
      serviceUnitIds,
      cellBranchId,
      requireContactFields: _requireContactFields,
      ...rest
    } = data;
    const updated = await this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        ...(gender !== undefined ? { gender: this.registry.parseGender(gender) } : {}),
        ...(specialOccasionDate !== undefined
          ? { specialOccasionDate: specialOccasionDate ? new Date(specialOccasionDate) : null }
          : {}),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : dateOfBirth === null ? null : undefined,
        membershipDate:
          membershipDate === null
            ? null
            : membershipDate
              ? new Date(membershipDate)
              : undefined,
        friendDate:
          friendDate === null ? null : friendDate ? new Date(friendDate) : undefined,
      },
      include: memberInclude,
    });
    if (customFields) {
      await this.registry.syncMemberCustomFields(churchId, id, customFields);
    }
    if (propertyIds) {
      await this.registry.syncMemberProperties(churchId, id, propertyIds);
    }
    if (serviceUnitIds !== undefined || cellBranchId !== undefined) {
      await this.registry.syncCongregantServiceGroups(churchId, id, {
        serviceUnitIds,
        cellBranchId,
      });
    }
    await this.activity.log(churchId, id, 'MEMBER_UPDATED', 'Congregant profile updated', {
      actorUserId,
    });
    return customFields || propertyIds || serviceUnitIds !== undefined || cellBranchId !== undefined
      ? this.getMember(churchId, id)
      : updated;
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

  async listFamilies(
    churchId: string,
    opts?: { search?: string; serviceUnitId?: string },
  ) {
    const where: Prisma.FamilyWhereInput = { churchId };
    const search = opts?.search?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (opts?.serviceUnitId) {
      where.members = {
        some: {
          serviceUnitMemberships: { some: { serviceUnitId: opts.serviceUnitId } },
        },
      };
    }
    return this.prisma.family.findMany({
      where,
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
        propertyAssignments: {
          include: { definition: { select: { id: true, name: true, description: true } } },
        },
        customFieldValues: {
          include: { definition: { select: { id: true, label: true, fieldKey: true } } },
        },
      },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async updateFamily(
    churchId: string,
    familyId: string,
    data: {
      name?: string;
      headMemberId?: string | null;
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      homePhone?: string;
      email?: string;
      homeCell?: string;
      specialOccasion?: string;
      specialOccasionDate?: string | null;
      isActive?: boolean;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
    },
  ) {
    await this.getFamily(churchId, familyId);
    const { customFields, propertyIds, specialOccasionDate, ...rest } = data;
    const family = await this.prisma.family.update({
      where: { id: familyId },
      data: {
        ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
        ...(rest.headMemberId !== undefined ? { headMemberId: rest.headMemberId } : {}),
        ...(rest.address !== undefined ? { address: rest.address } : {}),
        ...(rest.address2 !== undefined ? { address2: rest.address2 } : {}),
        ...(rest.city !== undefined ? { city: rest.city } : {}),
        ...(rest.state !== undefined ? { state: rest.state } : {}),
        ...(rest.zip !== undefined ? { zip: rest.zip } : {}),
        ...(rest.country !== undefined ? { country: rest.country } : {}),
        ...(rest.homePhone !== undefined ? { homePhone: rest.homePhone } : {}),
        ...(rest.email !== undefined ? { email: rest.email } : {}),
        ...(rest.homeCell !== undefined ? { homeCell: rest.homeCell?.trim() || null } : {}),
        ...(rest.specialOccasion !== undefined
          ? { specialOccasion: rest.specialOccasion?.trim() || null }
          : {}),
        ...(specialOccasionDate !== undefined
          ? { specialOccasionDate: specialOccasionDate ? new Date(specialOccasionDate) : null }
          : {}),
        ...(rest.isActive !== undefined ? { isActive: rest.isActive } : {}),
      },
      include: { members: true },
    });
    if (customFields) {
      await this.registry.syncFamilyCustomFields(churchId, familyId, customFields);
    }
    if (propertyIds) {
      await this.registry.syncFamilyProperties(churchId, familyId, propertyIds);
    }
    return family;
  }

  async createFamily(
    churchId: string,
    name: string,
    headMemberId?: string,
    actorUserId?: string,
    data?: {
      address?: string;
      address2?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
      homePhone?: string;
      email?: string;
      homeCell?: string;
      specialOccasion?: string;
      specialOccasionDate?: string;
      customFields?: Record<string, string | boolean | null>;
      propertyIds?: string[];
    },
  ) {
    const family = await this.prisma.family.create({
      data: {
        churchId,
        name,
        headMemberId,
        address: data?.address,
        address2: data?.address2,
        city: data?.city,
        state: data?.state,
        zip: data?.zip,
        country: data?.country,
        homePhone: data?.homePhone,
        email: data?.email,
        homeCell: data?.homeCell?.trim() || null,
        specialOccasion: data?.specialOccasion?.trim() || null,
        specialOccasionDate: data?.specialOccasionDate
          ? new Date(data.specialOccasionDate)
          : undefined,
      },
      include: { members: true },
    });
    if (data?.customFields) {
      await this.registry.syncFamilyCustomFields(churchId, family.id, data.customFields);
    }
    if (data?.propertyIds) {
      await this.registry.syncFamilyProperties(churchId, family.id, data.propertyIds);
    }
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

  async getUsheringWeeklyAttendanceFlow(churchId: string, weeks = 6) {
    const unit = await this.prisma.serviceUnit.findFirst({
      where: { churchId, departmentCode: 'USHERING', isActive: true },
      select: { id: true, name: true },
    });
    if (!unit) {
      return { source: 'ushering' as const, serviceUnitId: null, serviceUnitName: null, weeks: [] };
    }

    const since = weekStartUtc(new Date());
    since.setUTCDate(since.getUTCDate() - weeks * 7);

    const records = await this.prisma.usheringWeeklyHeadcount.findMany({
      where: { churchId, serviceUnitId: unit.id, weekStart: { gte: since } },
      orderBy: { weekStart: 'asc' },
    });

    return {
      source: 'ushering' as const,
      serviceUnitId: unit.id,
      serviceUnitName: unit.name,
      weeks: records.map((r) => ({
        period: r.weekStart.toISOString().slice(0, 10),
        male: r.male,
        female: r.female,
        babies: r.babies,
        children: r.children,
        totalAttendees: r.totalAttendees,
        present: r.totalAttendees,
        absent: 0,
        rate: r.totalAttendees > 0 ? 1 : 0,
      })),
    };
  }
}
