import { ForbiddenException, Injectable } from '@nestjs/common';
import { ModuleAccessService } from '../access/module-access.service';
import {
  BUS_DRIVER_MEMBER_ROLES,
  CHURCH_STAFF_USER_ROLES,
} from '../access/access.constants';
import { PrismaService } from '../../prisma/prisma.module';

@Injectable()
export class BusAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  async assertBusMinistryAccess(userId: string, churchId: string): Promise<boolean> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) return false;
    if (this.moduleAccess.isChurchStaff(ctx)) return true;
    if (this.moduleAccess.canAccessServiceUnitHub(ctx)) return true;
    return ctx.memberRoles.some((r) =>
      BUS_DRIVER_MEMBER_ROLES.includes(r as (typeof BUS_DRIVER_MEMBER_ROLES)[number]),
    );
  }

  async requireBusMinistry(userId: string, churchId: string) {
    const ok = await this.assertBusMinistryAccess(userId, churchId);
    if (!ok) throw new ForbiddenException('Bus ministry access required');
  }

  async resolveDriverForUser(userId: string, churchId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) return null;
    const hasDriverRole =
      ctx.memberRoles.includes('DRIVER') || this.moduleAccess.isChurchStaff(ctx);
    if (!hasDriverRole) return null;
    return this.prisma.driverProfile.findFirst({
      where: { userId, isActive: true, user: { churchId } },
    });
  }

  async canOperateDriverEndpoints(userId: string, churchId: string): Promise<boolean> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) return false;
    if (this.moduleAccess.isChurchStaff(ctx)) return true;
    if (!ctx.memberRoles.includes('DRIVER')) return false;
    const profile = await this.resolveDriverForUser(userId, churchId);
    return !!profile;
  }

  async assertDriverIdForUser(
    userId: string,
    churchId: string,
    driverId: string,
  ): Promise<void> {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (this.moduleAccess.isChurchStaff(ctx)) return;
    const profile = await this.resolveDriverForUser(userId, churchId);
    if (!profile || profile.id !== driverId) {
      throw new ForbiddenException('You may only update your own driver profile');
    }
  }

  async requireStaffOrDriver(userId: string, churchId: string) {
    const ctx = await this.moduleAccess.resolveContext(userId, churchId);
    if (!ctx) throw new ForbiddenException('Access denied');
    if (this.moduleAccess.isChurchStaff(ctx)) return ctx;
    const driver = await this.resolveDriverForUser(userId, churchId);
    if (!driver) throw new ForbiddenException('Church staff or bus driver required');
    return ctx;
  }

  isStaff(ctx: { userRoles: string[] }): boolean {
    return ctx.userRoles.some((r) =>
      CHURCH_STAFF_USER_ROLES.includes(r as (typeof CHURCH_STAFF_USER_ROLES)[number]),
    );
  }
}
