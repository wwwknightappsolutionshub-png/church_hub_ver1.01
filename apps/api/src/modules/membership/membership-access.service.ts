import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.module';

const CHURCH_STAFF_ROLES = ['ADMIN', 'PASTOR'] as const;

@Injectable()
export class MembershipAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Automation hub: staff, member admin, or UserRole LEADER. */
  async canViewAutomation(userId: string, churchId: string): Promise<boolean> {
    if (await this.canManageMembers(userId, churchId)) return true;
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    const names = user?.roles.map((r) => r.role.name) ?? [];
    return names.includes('LEADER');
  }

  /** Church staff (UserRole) or linked Member with ADMIN role may manage membership CRUD. */
  async canManageMembers(userId: string, churchId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      include: {
        roles: { include: { role: true } },
        member: { select: { roles: true } },
      },
    });
    if (!user) return false;

    const userRoleNames = user.roles.map((r) => r.role.name);
    if (userRoleNames.some((n) => CHURCH_STAFF_ROLES.includes(n as (typeof CHURCH_STAFF_ROLES)[number]))) {
      return true;
    }

    return user.member?.roles.includes('ADMIN') ?? false;
  }

  /** Directory list/detail visibility — Church Admin or Pastor UserRole only. */
  async canViewMembershipDirectory(userId: string, churchId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      include: { roles: { include: { role: { select: { name: true } } } } },
    });
    if (!user) return false;
    const names = user.roles.map((r) => r.role.name);
    return names.some((n) => CHURCH_STAFF_ROLES.includes(n as (typeof CHURCH_STAFF_ROLES)[number]));
  }

  /** Add congregant/family: any active church user (directories remain Admin/Pastor-only). */
  async canCreateMembers(userId: string, churchId: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      select: { id: true },
    });
    return Boolean(user);
  }

  async getChurchSummary(churchId: string | null) {
    if (!churchId) return null;
    return this.prisma.church.findUnique({
      where: { id: churchId },
      select: { id: true, name: true, slug: true, settings: true },
    });
  }

  private async loadUserWithRoles(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        avatarUrl: true,
        churchId: true,
        roles: { include: { role: { select: { name: true } } } },
      },
    });
  }

  async getSessionContext(userId: string, churchId: string | null) {
    const platformUser = await this.loadUserWithRoles(userId);
    const platformRoles = platformUser?.roles.map((r) => r.role.name) ?? [];
    if (platformRoles.includes('PLATFORM_ADMIN')) {
      return {
        user: platformUser
          ? {
              id: platformUser.id,
              email: platformUser.email,
              firstName: platformUser.firstName,
              lastName: platformUser.lastName,
              nickname: platformUser.nickname,
              phone: platformUser.phone,
              avatarUrl: platformUser.avatarUrl,
              userRoles: platformRoles,
            }
          : null,
        member: null,
        memberRoles: [] as string[],
        canManageMembers: false,
        canViewMembershipDirectory: false,
        canAddCongregants: false,
        isMemberAdmin: false,
      };
    }

    if (!churchId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, churchId: null, isActive: true },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          nickname: true,
          phone: true,
          avatarUrl: true,
          roles: { include: { role: { select: { name: true } } } },
        },
      });
      const userRoles = user?.roles.map((r) => r.role.name) ?? [];
      return {
        user: user
          ? {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              nickname: user.nickname,
              phone: user.phone,
              avatarUrl: user.avatarUrl,
              userRoles,
            }
          : null,
        member: null,
        memberRoles: [] as string[],
        canManageMembers: false,
        canViewMembershipDirectory: false,
        canAddCongregants: false,
        isMemberAdmin: false,
      };
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, churchId, isActive: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        nickname: true,
        phone: true,
        avatarUrl: true,
        roles: { include: { role: { select: { name: true } } } },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            nickname: true,
            phone: true,
            avatarUrl: true,
            roles: true,
            status: true,
          },
        },
      },
    });

    const userRoles = user?.roles.map((r) => r.role.name) ?? [];
    const memberRoles = user?.member?.roles ?? [];
    const canManageMembers = user
      ? await this.canManageMembers(userId, churchId)
      : false;
    const canViewMembershipDirectory = user
      ? await this.canViewMembershipDirectory(userId, churchId)
      : false;
    const canAddCongregants = user
      ? await this.canCreateMembers(userId, churchId)
      : false;

    return {
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            nickname: user.nickname,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            userRoles,
          }
        : null,
      member: user?.member ?? null,
      memberRoles,
      canManageMembers,
      canViewMembershipDirectory,
      canAddCongregants,
      isMemberAdmin: memberRoles.includes('ADMIN'),
    };
  }
}
