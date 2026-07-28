import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.module';
import { ROLES_KEY } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });

    const roleNames = userRoles.map((ur) => ur.role.name);
    request.user.roles = roleNames;

    if (requiredRoles.includes('PLATFORM_ADMIN')) {
      if (roleNames.includes('PLATFORM_ADMIN')) return true;
      // Custom platform support roles: allowed past RolesGate; PlatformPermissionGuard enforces finer access.
      const hasPlatformScope = userRoles.some((ur) => ur.role.scope === 'PLATFORM');
      if (hasPlatformScope) return true;
      throw new ForbiddenException('Platform administrator access required');
    }

    const allowed =
      roleNames.includes('ADMIN') ||
      requiredRoles.some((role) => roleNames.includes(role));

    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
