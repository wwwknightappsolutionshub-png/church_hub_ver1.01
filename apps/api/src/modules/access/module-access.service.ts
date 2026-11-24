import { Injectable } from '@nestjs/common';
import { MemberRoleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import { MemberStatus } from '@prisma/client';
import {
  CHURCH_STAFF_USER_ROLES,
  ESTABLISHMENT_MANAGER_MEMBER_ROLES,
  ESTABLISHMENT_MANAGER_UNIT_NAMES,
  ESTABLISHMENT_VIEW_ONLY_UNIT_NAMES,
  ESTABLISHMENT_WORKER_UNIT_NAMES,
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
import { isUnitDeputyRole } from '../service-units/service-unit-leader-roles';
import {
  ESTABLISHMENT_ACCESS_NONE,
  establishmentAccessFromMode,
  type EstablishmentAccess,
} from './establishment-access.types';

export interface UserMemberContext {
  userId: string;
  churchId: string;
  memberId: string | null;
  memberStatus: MemberStatus | null;
  userRoles: string[];
  memberRoles: MemberRoleType[];
  unitMembershipIds: string[];
  unitAdminUnitIds: string[];
  /** Units where the member is Assistant or Secretary (not Unit Admin). */
  unitDeputyUnitIds: string[];
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
              select: { serviceUnitId: true, isUnitAdmin: true, role: true },
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
    const unitDeputyUnitIds = leaderships
      .filter((l) => !l.isUnitAdmin && isUnitDeputyRole(l.role))
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
      unitDeputyUnitIds,
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
    if (
      ctx.unitMembershipIds.length > 0 ||
      ctx.unitAdminUnitIds.length > 0 ||
      ctx.unitDeputyUnitIds.length > 0
    ) {
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
    const access = await this.resolveEstablishmentAccess(ctx);
    return access.mode !== 'none';
  }

  /**
   * Establishment access matrix (Phase 2):
   * - manager: Admin/Pastor, Follow-up Unit Leader, Harvesters Unit Leader
   * - worker: Follow-up / Harvesters / WFS members (assigned-only mutate)
   * - viewOnly: Prayer Squad
   * - wsfLeader: cell branch leaders — read-only, WSF-scoped contacts
   * - none: e.g. UserRole LEADER with no relevant unit
   */
  async resolveEstablishmentAccess(ctx: UserMemberContext): Promise<EstablishmentAccess> {
    const wsfBranchIds = await this.listWsfBranchIdsForUser(ctx);

    if (this.isChurchStaff(ctx)) {
      return establishmentAccessFromMode('manager', wsfBranchIds);
    }

    if (
      ctx.memberRoles.some((r) =>
        ESTABLISHMENT_MANAGER_MEMBER_ROLES.includes(
          r as (typeof ESTABLISHMENT_MANAGER_MEMBER_ROLES)[number],
        ),
      )
    ) {
      return establishmentAccessFromMode('manager', wsfBranchIds);
    }

    const unitFlags = ctx.memberId
      ? await this.resolveEstablishmentUnitFlags(ctx)
      : {
          isManagerUnitLeader: false,
          isWorkerUnit: false,
          isViewOnlyUnit: false,
        };

    if (unitFlags.isManagerUnitLeader) {
      return establishmentAccessFromMode('manager', wsfBranchIds);
    }

    if (unitFlags.isWorkerUnit) {
      return establishmentAccessFromMode('worker');
    }

    if (
      ctx.memberRoles.some((r) =>
        FOLLOW_UP_MEMBER_ROLES.includes(r as (typeof FOLLOW_UP_MEMBER_ROLES)[number]),
      )
    ) {
      // EVANGELIST (and similar) without manager unit leadership → worker
      return establishmentAccessFromMode('worker');
    }

    if (unitFlags.isViewOnlyUnit) {
      return establishmentAccessFromMode('viewOnly');
    }

    if (wsfBranchIds.length > 0) {
      return establishmentAccessFromMode('wsfLeader', wsfBranchIds);
    }

    return ESTABLISHMENT_ACCESS_NONE;
  }

  private async resolveEstablishmentUnitFlags(ctx: UserMemberContext) {
    const units = await this.prisma.serviceUnit.findMany({
      where: {
        churchId: ctx.churchId,
        name: { in: [...FOLLOW_UP_ACCESS_UNIT_NAMES] },
        OR: [
          { members: { some: { memberId: ctx.memberId! } } },
          { leaders: { some: { memberId: ctx.memberId! } } },
        ],
      },
      select: {
        id: true,
        name: true,
        leaders: {
          where: { memberId: ctx.memberId! },
          select: { isUnitAdmin: true, role: true },
        },
      },
    });

    let isManagerUnitLeader = false;
    let isWorkerUnit = false;
    let isViewOnlyUnit = false;

    for (const unit of units) {
      const name = unit.name;
      const isManagerUnit = ESTABLISHMENT_MANAGER_UNIT_NAMES.includes(
        name as (typeof ESTABLISHMENT_MANAGER_UNIT_NAMES)[number],
      );
      const isWorkerName = ESTABLISHMENT_WORKER_UNIT_NAMES.includes(
        name as (typeof ESTABLISHMENT_WORKER_UNIT_NAMES)[number],
      );
      const isViewOnlyName = ESTABLISHMENT_VIEW_ONLY_UNIT_NAMES.includes(
        name as (typeof ESTABLISHMENT_VIEW_ONLY_UNIT_NAMES)[number],
      );

      const leadership = unit.leaders[0];
      const isPrimaryLeader =
        !!leadership &&
        (leadership.isUnitAdmin || !isUnitDeputyRole(leadership.role));

      if (isManagerUnit && isPrimaryLeader) {
        isManagerUnitLeader = true;
      }
      if (isWorkerName) {
        isWorkerUnit = true;
      }
      if (isViewOnlyName) {
        isViewOnlyUnit = true;
      }
    }

    return { isManagerUnitLeader, isWorkerUnit, isViewOnlyUnit };
  }

  /** WSF cell branches this user leads (primary or deputy). */
  async listWsfBranchIdsForUser(ctx: UserMemberContext): Promise<string[]> {
    const [led, deputy] = await Promise.all([
      this.prisma.cellBranch.findMany({
        where: { churchId: ctx.churchId, leaderUserId: ctx.userId },
        select: { id: true },
      }),
      this.prisma.cellLeadershipDeputy.findMany({
        where: {
          churchId: ctx.churchId,
          userId: ctx.userId,
          branchId: { not: null },
        },
        select: { branchId: true },
      }),
    ]);
    return [
      ...new Set([
        ...led.map((b) => b.id),
        ...deputy.map((d) => d.branchId!).filter(Boolean),
      ]),
    ];
  }

  /**
   * Prisma where-clause fragment for Establishment list/get scoping.
   * Returns null when the caller may see all church contacts (manager).
   * Returns `{ id: 'impossible' }` style empty when mode is none (caller should 403 first).
   */
  buildEstablishmentListScope(
    access: EstablishmentAccess,
    userId: string,
  ): Record<string, unknown> | null {
    switch (access.mode) {
      case 'manager':
        return null;
      case 'worker':
        return { assignedToId: userId };
      case 'viewOnly':
        return { assignedToId: { not: null } };
      case 'wsfLeader':
        if (!access.wsfBranchIds.length) {
          return { id: '__no_wsf_scope__' };
        }
        return { wsfCellBranchId: { in: access.wsfBranchIds } };
      case 'none':
      default:
        return { id: '__no_establishment_access__' };
    }
  }

  canViewEstablishmentRecord(
    access: EstablishmentAccess,
    userId: string,
    row: { assignedToId: string | null; wsfCellBranchId?: string | null },
  ): boolean {
    switch (access.mode) {
      case 'manager':
        return true;
      case 'worker':
        return row.assignedToId === userId;
      case 'viewOnly':
        return row.assignedToId != null;
      case 'wsfLeader':
        return (
          !!row.wsfCellBranchId && access.wsfBranchIds.includes(row.wsfCellBranchId)
        );
      default:
        return false;
    }
  }

  canMutateEstablishmentRecord(
    access: EstablishmentAccess,
    userId: string,
    row: { assignedToId: string | null },
  ): boolean {
    if (!access.canMutate) return false;
    if (access.mode === 'manager') return true;
    if (access.mode === 'worker') return row.assignedToId === userId;
    return false;
  }

  async getEstablishmentAccessForUser(
    userId: string,
    churchId: string,
  ): Promise<EstablishmentAccess> {
    const ctx = await this.resolveContext(userId, churchId);
    if (!ctx) return ESTABLISHMENT_ACCESS_NONE;
    return this.resolveEstablishmentAccess(ctx);
  }

  async canViewServiceUnit(ctx: UserMemberContext, serviceUnitId: string): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return true;
    return ctx.unitMembershipIds.includes(serviceUnitId);
  }

  /**
   * Operate the unit (members, meetings, attendance, etc.).
   * Includes volunteer Unit Admin and Assistant/Secretary deputies.
   */
  canManageServiceUnit(ctx: UserMemberContext, serviceUnitId: string): boolean {
    if (this.isChurchStaff(ctx)) return true;
    return (
      ctx.unitAdminUnitIds.includes(serviceUnitId) ||
      ctx.unitDeputyUnitIds.includes(serviceUnitId)
    );
  }

  /** Church staff or Unit Admin only — not Assistant/Secretary. */
  canManageUnitLeaders(ctx: UserMemberContext, serviceUnitId: string): boolean {
    if (this.isChurchStaff(ctx)) return true;
    return ctx.unitAdminUnitIds.includes(serviceUnitId);
  }

  /** Assign volunteer Unit Admin (isUnitAdmin) — church ADMIN/PASTOR only. */
  canAssignUnitAdmin(ctx: UserMemberContext): boolean {
    return this.isChurchStaff(ctx);
  }

  /** Assign Assistant/Secretary — church staff or Unit Admin of this unit. */
  canAssignUnitDeputies(ctx: UserMemberContext, serviceUnitId: string): boolean {
    return this.canManageUnitLeaders(ctx, serviceUnitId);
  }

  canManageStaff(ctx: UserMemberContext): boolean {
    return ctx.userRoles.some((r) => r === 'PASTOR' || r === 'ADMIN');
  }

  /** PASTOR user role only. */
  async canAccessSermonNote(ctx: UserMemberContext): Promise<boolean> {
    return ctx.userRoles.includes('PASTOR');
  }

  /**
   * Ministry/Cells: church staff, provincial leaders (incl. province deputies),
   * and cell branch ministers / Assistants / Secretaries.
   */
  async canAccessMinistryCells(ctx: UserMemberContext): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return true;
    if (ctx.userRoles.includes('PROVINCIAL_LEADER')) {
      const province = await this.prisma.cellProvince.findFirst({
        where: { churchId: ctx.churchId, leaderUserId: ctx.userId },
        select: { id: true },
      });
      if (province) return true;
    }
    const provinceDeputy = await this.prisma.cellLeadershipDeputy.findFirst({
      where: { churchId: ctx.churchId, userId: ctx.userId, scope: 'PROVINCE' },
      select: { id: true },
    });
    if (provinceDeputy) return true;
    return this.isCellBranchWorkspaceUser(ctx);
  }

  /**
   * Cell Minister / Assistant / Secretary only (not Admin/Pastor).
   * Used for post-login landing on the branch workspace.
   */
  async isCellBranchWorkspaceUser(ctx: UserMemberContext): Promise<boolean> {
    if (this.isChurchStaff(ctx)) return false;
    const branchLeader = await this.prisma.cellBranch.findFirst({
      where: { churchId: ctx.churchId, leaderUserId: ctx.userId },
      select: { id: true },
    });
    if (branchLeader) return true;
    const branchDeputy = await this.prisma.cellLeadershipDeputy.findFirst({
      where: { churchId: ctx.churchId, userId: ctx.userId, scope: 'BRANCH' },
      select: { id: true },
    });
    return !!branchDeputy;
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
      establishmentAccess: ESTABLISHMENT_ACCESS_NONE,
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
      isCellBranchWorkspaceUser: false,
      unitMembershipIds: [] as string[],
      unitAdminUnitIds: [] as string[],
      unitDeputyUnitIds: [] as string[],
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
        establishmentAccess: ESTABLISHMENT_ACCESS_NONE,
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
        isCellBranchWorkspaceUser: false,
        unitMembershipIds: [] as string[],
        unitAdminUnitIds: [] as string[],
        unitDeputyUnitIds: [] as string[],
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
        establishmentAccess: ESTABLISHMENT_ACCESS_NONE,
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
        isCellBranchWorkspaceUser: false,
        unitMembershipIds: [] as string[],
        unitAdminUnitIds: [] as string[],
        unitDeputyUnitIds: [] as string[],
        unitLeaderUnitIds: [] as string[],
      };
    }

    const establishmentAccess = await this.resolveEstablishmentAccess(ctx);
    const isCellBranchWorkspaceUser = await this.isCellBranchWorkspaceUser(ctx);

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
      canAccessFollowUp: establishmentAccess.mode !== 'none',
      establishmentAccess,
      canAccessServiceUnitHub: this.canAccessServiceUnitHub(ctx),
      canAccessMyProfile: this.canAccessMyProfile(ctx),
      canAccessDepartmentTools: this.canAccessDepartmentTools(ctx),
      canAccessSermonNote: await this.canAccessSermonNote(ctx),
      canAccessMinistryCells: await this.canAccessMinistryCells(ctx),
      isCellBranchWorkspaceUser,
      unitMembershipIds: ctx.unitMembershipIds,
      unitAdminUnitIds: ctx.unitAdminUnitIds,
      unitDeputyUnitIds: ctx.unitDeputyUnitIds,
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
