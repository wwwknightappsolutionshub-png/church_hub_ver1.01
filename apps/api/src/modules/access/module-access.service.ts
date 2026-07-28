import { Injectable } from '@nestjs/common';
import { MemberRoleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MemberStatus } from '@prisma/client';
import {
  CHURCH_STAFF_USER_ROLES,
  FOLLOW_UP_ACCESS_UNIT_NAMES,
  FOLLOW_UP_MEMBER_ROLES,
  PROFILE_ACCESS_ROLES,
  PROFILE_ACCESS_STATUSES,
  SERVICE_UNIT_HUB_STATUSES,
  YOUTH_MEMBER_ROLES,
  COMMUNITY_MEMBER_STATUSES,
} from './access.constants';
import {
  ALL_PLATFORM_PERMISSION_KEYS,
  toPermissionKey,
  type PlatformPermissionKey,
} from '../platform/platform-permissions.catalog';

export interface UserMemberContext {
  userId: string;
  churchId: string;
  memberId: string | null;
  memberStatus: MemberStatus | null;
  userRoles: string[];
  memberRoles: MemberRoleType[];
  unitMembershipIds: string[];
  unitAdminUnitIds: string[];
  unitLeaderUnitIds: string[];
}

@Injectable()
export class ModuleAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveContext(userId: string, churchId: string): Promise<UserMemberContext | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      include: {
        roles: { include: { role: true } },
        member: {
          include: {
            serviceUnitMemberships: { select: { serviceUnitId: true } },
            serviceUnitLeaderships: {
              select: { serviceUnitId: true, isUnitAdmin: true },
            },
          },
        },
      },
    });
    if (!user) return null;

    const userRoles = user.roles.map((r) => r.role.name);
    const memberRoles = user.member?.roles ?? [];
    const memberStatus = user.member?.status ?? null;
    const unitMembershipIds =
      user.member?.serviceUnitMemberships.map((m) => m.serviceUnitId) ?? [];
    const leaderships = user.member?.serviceUnitLeaderships ?? [];
    const unitLeaderUnitIds = leaderships.map((l) => l.serviceUnitId);
    const unitAdminUnitIds = leaderships
      .filter((l) => l.isUnitAdmin)
      .map((l) => l.serviceUnitId);

    return {
      userId,
      churchId,
      memberId: user.member?.id ?? null,
      memberStatus,
      userRoles,
      memberRoles,
      unitMembershipIds: [...new Set([...unitMembershipIds, ...unitLeaderUnitIds])],
      unitAdminUnitIds,
      unitLeaderUnitIds,
    };
  }

  canAccessMyProfile(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    if (!ctx.memberId || !ctx.memberStatus) return false;
    if (ctx.memberStatus === 'VISITOR') return false;
    if (
      PROFILE_ACCESS_STATUSES.includes(
        ctx.memberStatus as (typeof PROFILE_ACCESS_STATUSES)[number],
      )
    ) {
      return true;
    }
    return ctx.memberRoles.some((r) =>
      PROFILE_ACCESS_ROLES.includes(r as (typeof PROFILE_ACCESS_ROLES)[number]),
    );
  }

  /** Church admin, pastor, or department unit leader/admin. */
  canAccessDepartmentTools(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    if (ctx.memberRoles.includes('ADMIN')) return true;
    return ctx.unitLeaderUnitIds.length > 0;
  }

  canAccessServiceUnitHub(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    if (!ctx.memberId || !ctx.memberStatus) return false;
    if (ctx.unitMembershipIds.length > 0 || ctx.unitAdminUnitIds.length > 0) {
      return true;
    }
    if (ctx.memberStatus === 'VISITOR') return false;
    return SERVICE_UNIT_HUB_STATUSES.includes(
      ctx.memberStatus as (typeof SERVICE_UNIT_HUB_STATUSES)[number],
    );
  }

  isChurchStaff(ctx: UserMemberContext): boolean {
    return ctx.userRoles.some((r) =>
      CHURCH_STAFF_USER_ROLES.includes(r as (typeof CHURCH_STAFF_USER_ROLES)[number]),
    );
  }

  async canAccessFollowUp(ctx: UserMemberContext): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return true;

    if (
      ctx.memberRoles.some((r) =>
        FOLLOW_UP_MEMBER_ROLES.includes(r as (typeof FOLLOW_UP_MEMBER_ROLES)[number]),
      )
    ) {
      return true;
    }

    if (!ctx.memberId) return false;

    const units = await this.prisma.serviceUnit.findMany({
      where: {
        churchId: ctx.churchId,
        name: { in: [...FOLLOW_UP_ACCESS_UNIT_NAMES] },
        OR: [
          { members: { some: { memberId: ctx.memberId } } },
          { leaders: { some: { memberId: ctx.memberId } } },
        ],
      },
      select: { id: true },
    });

    return units.length > 0;
  }

  async canViewServiceUnit(ctx: UserMemberContext, serviceUnitId: string): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return true;
    return ctx.unitMembershipIds.includes(serviceUnitId);
  }

  canManageServiceUnit(ctx: UserMemberContext, serviceUnitId: string): boolean {
    if (this.isChurchStaff(ctx)) return true;
    return ctx.unitAdminUnitIds.includes(serviceUnitId);
  }

  canManageUnitLeaders(ctx: UserMemberContext, serviceUnitId: string): boolean {
    return this.canManageServiceUnit(ctx, serviceUnitId);
  }

  canManageStaff(ctx: UserMemberContext): boolean {
    return ctx.userRoles.some((r) => r === 'PASTOR' || r === 'ADMIN');
  }

  /** PASTOR user role only. */
  async canAccessSermonNote(ctx: UserMemberContext): Promise<boolean> {
    return ctx.userRoles.includes('PASTOR');
  }

  /** Church admin, pastor, assigned provincial leader, or assigned cell branch leader. */
  async canAccessMinistryCells(ctx: UserMemberContext): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return true;
    if (ctx.userRoles.includes('PROVINCIAL_LEADER')) {
      const province = await this.prisma.cellProvince.findFirst({
        where: { churchId: ctx.churchId, leaderUserId: ctx.userId },
        select: { id: true },
      });
      if (province) return true;
    }
    const branch = await this.prisma.cellBranch.findFirst({
      where: { churchId: ctx.churchId, leaderUserId: ctx.userId },
      select: { id: true },
    });
    return !!branch;
  }

  private async userRoleNames(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      include: { roles: { include: { role: true } } },
    });
    return user?.roles.map((r) => r.role.name) ?? [];
  }

  private async resolvePlatformFlags(userId: string, roleNames: string[]) {
    const isPlatformAdmin = roleNames.includes('PLATFORM_ADMIN');
    if (isPlatformAdmin) {
      return {
        isPlatformAdmin: true,
        isPlatformOperator: true,
        platformPermissions: [...ALL_PLATFORM_PERMISSION_KEYS] as string[],
      };
    }

    const platformRoles = await this.prisma.userRole.findMany({
      where: { userId, role: { scope: 'PLATFORM' } },
      include: { role: { include: { permissions: true } } },
    });
    if (!platformRoles.length) {
      return {
        isPlatformAdmin: false,
        isPlatformOperator: false,
        platformPermissions: [] as string[],
      };
    }

    const keys = new Set<string>();
    for (const ur of platformRoles) {
      for (const p of ur.role.permissions) {
        keys.add(toPermissionKey(p.resource, p.action));
      }
    }
    return {
      isPlatformAdmin: false,
      isPlatformOperator: true,
      platformPermissions: [...keys].filter((k): k is PlatformPermissionKey =>
        ALL_PLATFORM_PERMISSION_KEYS.includes(k as PlatformPermissionKey),
      ),
    };
  }

  private platformAccessFlags(
    userRoles: string[],
    platformPermissions: string[],
    isPlatformAdmin: boolean,
  ) {
    return {
      isPlatformAdmin,
      isPlatformOperator: true,
      platformPermissions,
      canManageStaff: false,
      canAccessFollowUp: false,
      canAccessServiceUnitHub: false,
      canAccessMyProfile: false,
      canAccessDepartmentTools: true,
      memberId: null,
      memberStatus: null,
      userRoles,
      memberRoles: [] as MemberRoleType[],
      isChurchStaff: false,
      canManageCommunications: false,
      canAccessSermonNote: false,
      canAccessMinistryCells: false,
      unitMembershipIds: [] as string[],
      unitAdminUnitIds: [] as string[],
      unitLeaderUnitIds: [] as string[],
    };
  }

  async getAccessFlags(userId: string, churchId: string | null) {
    const roleNames = await this.userRoleNames(userId);
    const platform = await this.resolvePlatformFlags(userId, roleNames);
    if (platform.isPlatformOperator) {
      return this.platformAccessFlags(
        roleNames,
        platform.platformPermissions,
        platform.isPlatformAdmin,
      );
    }

    if (!churchId) {
      return {
        isPlatformAdmin: false,
        isPlatformOperator: false,
        platformPermissions: [] as string[],
        canManageStaff: false,
        canAccessFollowUp: false,
        canAccessServiceUnitHub: false,
        canAccessMyProfile: false,
        canAccessDepartmentTools: false,
        memberId: null,
        memberStatus: null,
        userRoles: roleNames,
        memberRoles: [] as MemberRoleType[],
        isChurchStaff: false,
        canManageCommunications: false,
        canAccessSermonNote: false,
        canAccessMinistryCells: false,
        unitMembershipIds: [] as string[],
        unitAdminUnitIds: [] as string[],
        unitLeaderUnitIds: [] as string[],
      };
    }

    const ctx = await this.resolveContext(userId, churchId);
    if (!ctx) {
      return {
        isPlatformAdmin: false,
        isPlatformOperator: false,
        platformPermissions: [] as string[],
        canManageStaff: false,
        canAccessFollowUp: false,
        canAccessServiceUnitHub: false,
        canAccessMyProfile: false,
        canAccessDepartmentTools: false,
        memberId: null,
        memberStatus: null,
        userRoles: [] as string[],
        memberRoles: [] as MemberRoleType[],
        isChurchStaff: false,
        canManageCommunications: false,
        canAccessSermonNote: false,
        canAccessMinistryCells: false,
        unitMembershipIds: [] as string[],
        unitAdminUnitIds: [] as string[],
        unitLeaderUnitIds: [] as string[],
      };
    }

    return {
      isPlatformAdmin: false,
      isPlatformOperator: false,
      platformPermissions: [] as string[],
      canManageStaff: this.canManageStaff(ctx),
      memberId: ctx.memberId,
      memberStatus: ctx.memberStatus,
      userRoles: ctx.userRoles,
      memberRoles: ctx.memberRoles,
      isChurchStaff: this.isChurchStaff(ctx),
      canManageCommunications: this.isChurchStaff(ctx),
      canAccessFollowUp: await this.canAccessFollowUp(ctx),
      canAccessServiceUnitHub: this.canAccessServiceUnitHub(ctx),
      canAccessMyProfile: this.canAccessMyProfile(ctx),
      canAccessDepartmentTools: this.canAccessDepartmentTools(ctx),
      canAccessSermonNote: await this.canAccessSermonNote(ctx),
      canAccessMinistryCells: await this.canAccessMinistryCells(ctx),
      unitMembershipIds: ctx.unitMembershipIds,
      unitAdminUnitIds: ctx.unitAdminUnitIds,
      unitLeaderUnitIds: ctx.unitLeaderUnitIds,
    };
  }

  async assertFollowUpAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    if (!ctx || !(await this.canAccessFollowUp(ctx))) {
      return false;
    }
    return true;
  }

  async assertServiceUnitView(userId: string, churchId: string, serviceUnitId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    if (!ctx || !(await this.canViewServiceUnit(ctx, serviceUnitId))) {
      return false;
    }
    return true;
  }

  async assertServiceUnitHubAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && this.canAccessServiceUnitHub(ctx);
  }

  async assertMyProfileAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && this.canAccessMyProfile(ctx);
  }

  canAccessBusMinistry(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    if (this.canAccessServiceUnitHub(ctx)) return true;
    return ctx.memberRoles.some((r) =>
      (['DRIVER', 'LEADER', 'ADMIN'] as const).includes(r as 'DRIVER'),
    );
  }

  async assertBusMinistryAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && this.canAccessBusMinistry(ctx);
  }

  canAccessYouth(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    return ctx.memberRoles.some((r) =>
      YOUTH_MEMBER_ROLES.includes(r as (typeof YOUTH_MEMBER_ROLES)[number]),
    );
  }

  async canAccessYouthExtended(ctx: UserMemberContext): Promise<boolean> {
    if (this.canAccessYouth(ctx)) return true;
    if (!ctx.memberId) return false;
    const inGroup = await this.prisma.youthGroupMember.findFirst({
      where: {
        memberId: ctx.memberId,
        youthGroup: { churchId: ctx.churchId, isActive: true },
      },
    });
    if (inGroup) return true;
    const parentLink = await this.prisma.parentGuardianLink.findFirst({
      where: {
        OR: [{ parentId: ctx.memberId }, { childId: ctx.memberId }],
        parent: { churchId: ctx.churchId },
      },
    });
    return !!parentLink;
  }

  canAccessCommunityHub(ctx: UserMemberContext): boolean {
    if (this.isChurchStaff(ctx)) return true;
    if (!ctx.memberId || !ctx.memberStatus) return false;
    if (ctx.memberStatus === 'VISITOR') return false;
    return COMMUNITY_MEMBER_STATUSES.includes(
      ctx.memberStatus as (typeof COMMUNITY_MEMBER_STATUSES)[number],
    );
  }

  canAccessCommunications(ctx: UserMemberContext): boolean {
    return this.canAccessCommunityHub(ctx);
  }

  async assertYouthAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && (await this.canAccessYouthExtended(ctx));
  }

  async assertCommunityHubAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && this.canAccessCommunityHub(ctx);
  }

  async assertCommunicationsAccess(userId: string, churchId: string) {
    const ctx = await this.resolveContext(userId, churchId);
    return !!ctx && this.canAccessCommunications(ctx);
  }
}
