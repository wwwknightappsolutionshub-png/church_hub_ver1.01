import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseTenantModulesFromSettings } from '@church-hub/shared-types';
import type { AuthUser } from '../auth/current-user.decorator';

export type MinistryCellsRole =
  | 'admin'
  | 'pastor'
  | 'provincialLeader'
  | 'cellLeader'
  | 'none';

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

  async resolveRole(
    user: AuthUser,
    churchId: string,
  ): Promise<{
    role: MinistryCellsRole;
    leaderBranchId: string | null;
    leaderProvinceId: string | null;
  }> {
    if (!user.churchId || user.churchId !== churchId) {
      return { role: 'none', leaderBranchId: null, leaderProvinceId: null };
    }
    const roles = await this.userRoleNames(user);
    if (roles.includes('ADMIN')) {
      return { role: 'admin', leaderBranchId: null, leaderProvinceId: null };
    }
    if (roles.includes('PASTOR')) {
      return { role: 'pastor', leaderBranchId: null, leaderProvinceId: null };
    }

    const province = await this.prisma.cellProvince.findFirst({
      where: { churchId, leaderUserId: user.userId },
      select: { id: true },
    });
    if (province) {
      return {
        role: 'provincialLeader',
        leaderBranchId: null,
        leaderProvinceId: province.id,
      };
    }

    const branch = await this.prisma.cellBranch.findFirst({
      where: { churchId, leaderUserId: user.userId },
      select: { id: true },
    });
    if (branch) {
      return {
        role: 'cellLeader',
        leaderBranchId: branch.id,
        leaderProvinceId: null,
      };
    }
    return { role: 'none', leaderBranchId: null, leaderProvinceId: null };
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
    if (ctx.role === 'provincialLeader' && ctx.leaderProvinceId === provinceId) {
      return ctx;
    }
    throw new ForbiddenException('Provincial leader access required for this province');
  }
}
