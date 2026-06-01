import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DepartmentCode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.module';
import {
  DEPT_MODULE_CODES,
  isDeptModuleCode,
  resolveDeptModuleCode,
} from '../../../prisma/dept-module-catalog';
import {
  isDepartmentModuleEnabled,
  parseDepartmentModuleSettings,
} from '../../common/department-module-settings';
import { ModuleAccessService, UserMemberContext } from '../access/module-access.service';

@Injectable()
export class DepartmentAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  async requireDeptUnit(churchId: string, serviceUnitId: string) {
    const row = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId, isActive: true },
    });
    if (!row) throw new NotFoundException('Service unit not found');

    const resolved = resolveDeptModuleCode(row.departmentCode, row.name);
    if (!resolved) {
      throw new NotFoundException(
        `Department module tools are only available for: ${DEPT_MODULE_CODES.join(', ')}`,
      );
    }

    const church = await this.prisma.church.findUnique({
      where: { id: churchId },
      select: { settings: true },
    });
    const config = parseDepartmentModuleSettings(church?.settings ?? {});
    if (!isDepartmentModuleEnabled(config, resolved)) {
      throw new NotFoundException(
        `${resolved} department module is currently deactivated for this tenant.`,
      );
    }

    if (row.departmentCode !== resolved) {
      const unit = await this.prisma.serviceUnit.update({
        where: { id: row.id },
        data: { departmentCode: resolved },
      });
      return unit;
    }

    return row;
  }

  /** Any active service unit (Phase 8 module not required). */
  private async requireActiveUnit(churchId: string, serviceUnitId: string) {
    const row = await this.prisma.serviceUnit.findFirst({
      where: { id: serviceUnitId, churchId, isActive: true },
    });
    if (!row) throw new NotFoundException('Service unit not found');
    return row;
  }

  async requireView(userId: string, churchId: string, serviceUnitId: string) {
    const unit = await this.requireDeptUnit(churchId, serviceUnitId);
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (!(await this.moduleAccess.canViewServiceUnit(ctx, serviceUnitId))) {
      throw new ForbiddenException('Not a member of this department');
    }
    return { ctx, unit };
  }

  async requireViewAnyUnit(userId: string, churchId: string, serviceUnitId: string) {
    const unit = await this.requireActiveUnit(churchId, serviceUnitId);
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (!(await this.moduleAccess.canViewServiceUnit(ctx, serviceUnitId))) {
      throw new ForbiddenException('Not a member of this service unit');
    }
    return { ctx, unit };
  }

  async requireParticipate(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.requireView(userId, churchId, serviceUnitId);
    if (!this.canParticipate(ctx, serviceUnitId)) {
      throw new ForbiddenException('Department membership required');
    }
    return { ctx, unit };
  }

  async requireParticipateAnyUnit(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.requireViewAnyUnit(userId, churchId, serviceUnitId);
    if (!this.canParticipate(ctx, serviceUnitId)) {
      throw new ForbiddenException('Service unit membership required');
    }
    return { ctx, unit };
  }

  async requireManage(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.requireView(userId, churchId, serviceUnitId);
    if (!this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) {
      throw new ForbiddenException('Unit admin or church staff required');
    }
    return { ctx, unit };
  }

  canLead(ctx: UserMemberContext, serviceUnitId: string): boolean {
    if (this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) return true;
    return ctx.unitLeaderUnitIds.includes(serviceUnitId);
  }

  /** Service unit leader or unit admin (not general church staff unless assigned). */
  canViewFeedbacks(ctx: UserMemberContext, serviceUnitId: string): boolean {
    return (
      ctx.unitAdminUnitIds.includes(serviceUnitId) ||
      ctx.unitLeaderUnitIds.includes(serviceUnitId)
    );
  }

  isChurchStaff(ctx: UserMemberContext): boolean {
    return this.moduleAccess.isChurchStaff(ctx);
  }

  async requireViewFeedbacks(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.requireViewAnyUnit(userId, churchId, serviceUnitId);
    if (!this.canViewFeedbacks(ctx, serviceUnitId)) {
      throw new ForbiddenException('Service unit leader or unit admin access required');
    }
    return { ctx, unit };
  }

  async requireLead(userId: string, churchId: string, serviceUnitId: string) {
    const { ctx, unit } = await this.requireView(userId, churchId, serviceUnitId);
    if (!this.canLead(ctx, serviceUnitId)) {
      throw new ForbiddenException('Department leader access required');
    }
    return { ctx, unit };
  }

  canParticipate(ctx: UserMemberContext, serviceUnitId: string): boolean {
    if (this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId)) return true;
    return ctx.unitMembershipIds.includes(serviceUnitId);
  }

  /** Resolves member id for report/notes when staff user has no direct member link. */
  async resolveAuthorMemberId(ctx: UserMemberContext): Promise<string> {
    if (ctx.memberId) return ctx.memberId;
    const user = await this.prisma.user.findFirst({
      where: { id: ctx.userId, churchId: ctx.churchId },
      select: { email: true },
    });
    if (user?.email) {
      const member = await this.prisma.member.findFirst({
        where: { churchId: ctx.churchId, email: user.email },
        select: { id: true },
      });
      if (member) return member.id;
    }
    const fallback = await this.prisma.member.findFirst({
      where: { churchId: ctx.churchId },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (fallback) return fallback.id;
    throw new BadRequestException('No member profile exists yet in this church.');
  }

  accessFlags(ctx: UserMemberContext, serviceUnitId: string) {
    const canManage = this.moduleAccess.canManageServiceUnit(ctx, serviceUnitId);
    const canLead = this.canLead(ctx, serviceUnitId);
    const canParticipate = this.canParticipate(ctx, serviceUnitId);
    const canViewFeedbacks = this.canViewFeedbacks(ctx, serviceUnitId);
    return {
      canManage,
      canLead,
      canParticipate,
      canSubmit: canParticipate,
      canDelete: canManage || canLead,
      canViewFeedbacks,
      canReplyFeedback: canViewFeedbacks,
      canPostStaffFeedback: this.isChurchStaff(ctx),
    };
  }

  static moduleCodes(): DepartmentCode[] {
    return [...DEPT_MODULE_CODES] as DepartmentCode[];
  }
}
