import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTenantModulesFromSettings } from '@church-hub/shared-types';
import type { AuthUser } from '../auth/current-user.decorator';
import { isCellDeputyRole, type CellDeputyRole } from './cell-leadership-deputies';

export type MinistryCellsRole =
  | 'admin'
  | 'pastor'
  | 'provincialLeader'
  | 'cellLeader'
  | 'none';

export type MinistryCellsResolved = {
  role: MinistryCellsRole;
  leaderBranchId: string | null;
  leaderProvinceId: string | null;
  /** True when access comes from ASSISTANT/SECRETARY, not primary leaderUserId. */
  isDeputy: boolean;
  deputyRole: CellDeputyRole | null;
  deputyBranchIds: string[];
  deputyProvinceIds: string[];
};

@Injectable()
export class MinistryCellsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertModuleEnabled(churchId: string) {
    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    if (!church) throw new NotFoundException('Church not found');
    const modules = parseTenantModulesFromSettings(church.settings);
    if (modules.ministryCells === false) {
      throw new ForbiddenException('Ministry/Cells is not enabled for your church');
    }
  }

  isChurchLeadership(user: AuthUser): boolean {
    return (user.roles ?? []).some((r) => r === 'ADMIN' || r === 'PASTOR');
  }

  private async userRoleNames(user: AuthUser): Promise<string[]> {
    if (user.roles?.length) return user.roles;
    const rows = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });
    return rows.map((r) => r.role.name);
  }

  async resolveRole(user: AuthUser, churchId: string): Promise<MinistryCellsResolved> {
    const empty: MinistryCellsResolved = {
      role: 'none',
      leaderBranchId: null,
      leaderProvinceId: null,
      isDeputy: false,
      deputyRole: null,
      deputyBranchIds: [],
      deputyProvinceIds: [],
    };

    if (!user.churchId || user.churchId !== churchId) {
      return empty;
    }
    const roles = await this.userRoleNames(user);
    if (roles.includes('ADMIN')) {
      return { ...empty, role: 'admin' };
    }
    if (roles.includes('PASTOR')) {
      return { ...empty, role: 'pastor' };
    }

    const province = await this.prisma.cellProvince.findFirst({
      where: { churchId, leaderUserId: user.userId },
      select: { id: true },
    });
    if (province) {
      return {
        ...empty,
        role: 'provincialLeader',
        leaderProvinceId: province.id,
      };
    }

    const branch = await this.prisma.cellBranch.findFirst({
      where: { churchId, leaderUserId: user.userId },
      select: { id: true },
    });
    if (branch) {
      return {
        ...empty,
        role: 'cellLeader',
        leaderBranchId: branch.id,
      };
    }

    const deputies = await this.prisma.cellLeadershipDeputy.findMany({
      where: { churchId, userId: user.userId },
      select: { scope: true, branchId: true, provinceId: true, role: true },
    });
    if (!deputies.length) return empty;

    const deputyBranchIds = deputies
      .filter((d) => d.scope === 'BRANCH' && d.branchId)
      .map((d) => d.branchId!) ;
    const deputyProvinceIds = deputies
      .filter((d) => d.scope === 'PROVINCE' && d.provinceId)
      .map((d) => d.provinceId!);
    const primaryDeputy = deputies[0];
    const deputyRole = isCellDeputyRole(primaryDeputy.role) ? primaryDeputy.role : null;

    if (deputyProvinceIds.length) {
      return {
        role: 'provincialLeader',
        leaderBranchId: null,
        leaderProvinceId: deputyProvinceIds[0] ?? null,
        isDeputy: true,
        deputyRole,
        deputyBranchIds,
        deputyProvinceIds,
      };
    }

    return {
      role: 'cellLeader',
      leaderBranchId: deputyBranchIds[0] ?? null,
      leaderProvinceId: null,
      isDeputy: true,
      deputyRole,
      deputyBranchIds,
      deputyProvinceIds,
    };
  }

  async assertCanAccess(user: AuthUser, churchId: string) {
    await this.assertModuleEnabled(churchId);
    const ctx = await this.resolveRole(user, churchId);
    if (ctx.role === 'none') {
      throw new ForbiddenException('You do not have access to Ministry/Cells');
    }
    return ctx;
  }

  async assertBranchAccess(user: AuthUser, churchId: string, branchId: string) {
    const ctx = await this.assertCanAccess(user, churchId);
    if (ctx.role === 'admin' || ctx.role === 'pastor') return ctx;
    if (ctx.deputyBranchIds.includes(branchId)) return ctx;
    if (ctx.role === 'provincialLeader' && ctx.leaderProvinceId) {
      const branch = await this.prisma.cellBranch.findFirst({
        where: { id: branchId, churchId, provinceId: ctx.leaderProvinceId },
        select: { id: true },
      });
      if (!branch) {
        throw new ForbiddenException('You can only access cells in your province');
      }
      return ctx;
    }
    if (ctx.leaderBranchId !== branchId) {
      throw new ForbiddenException('You can only access your assigned cell branch');
    }
    return ctx;
  }

  async assertLeadership(user: AuthUser, churchId: string) {
    const ctx = await this.assertCanAccess(user, churchId);
    if (ctx.role !== 'admin' && ctx.role !== 'pastor') {
      throw new ForbiddenException('Church admin or pastor access required');
    }
    return ctx;
  }

  async assertProvinceLeadership(user: AuthUser, churchId: string, provinceId: string) {
    const ctx = await this.assertCanAccess(user, churchId);
    if (ctx.role === 'admin' || ctx.role === 'pastor') return ctx;
    if (ctx.deputyProvinceIds.includes(provinceId)) return ctx;
    if (ctx.role === 'provincialLeader' && ctx.leaderProvinceId === provinceId) {
      return ctx;
    }
    throw new ForbiddenException('Provincial leader access required for this province');
  }

  /**
   * Assign Assistant/Secretary: church staff, or the primary (non-deputy) leader of the scope.
   * Deputies cannot assign other deputies or change primary leaders.
   */
  async assertCanAssignDeputies(
    user: AuthUser,
    churchId: string,
    scope: { branchId?: string; provinceId?: string },
  ) {
    const ctx = await this.assertCanAccess(user, churchId);
    if (ctx.role === 'admin' || ctx.role === 'pastor') return ctx;
    if (ctx.isDeputy) {
      throw new ForbiddenException(
        'Assistants and Secretaries cannot assign leadership roles',
      );
    }
    if (scope.branchId) {
      const branch = await this.prisma.cellBranch.findFirst({
        where: { id: scope.branchId, churchId },
        select: { leaderUserId: true },
      });
      if (!branch) throw new NotFoundException('Branch not found');
      if (branch.leaderUserId === user.userId) return ctx;
      throw new ForbiddenException(
        'Only the cell leader or church staff can assign Assistant or Secretary',
      );
    }
    if (scope.provinceId) {
      const province = await this.prisma.cellProvince.findFirst({
        where: { id: scope.provinceId, churchId },
        select: { leaderUserId: true },
      });
      if (!province) throw new NotFoundException('Province not found');
      if (province.leaderUserId === user.userId) return ctx;
      throw new ForbiddenException(
        'Only the provincial leader or church staff can assign Assistant or Secretary',
      );
    }
    throw new ForbiddenException('Branch or province is required');
  }
}
