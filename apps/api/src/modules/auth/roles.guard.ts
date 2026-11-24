import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.module';
import { AuthzDenialService } from '../../common/security/authz-denial.service';
import { resolveClientIp } from '../../common/security/client-ip';
import { ROLES_KEY } from './decorators';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private readonly authzDenial: AuthzDenialService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId) {
      this.deny(request, user, requiredRoles, 'Authentication required');
      throw new ForbiddenException('Authentication required');
    }

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
      this.deny(request, user, requiredRoles, 'Platform administrator access required');
      throw new ForbiddenException('Platform administrator access required');
    }

    const allowed =
      roleNames.includes('ADMIN') ||
      requiredRoles.some((role) => roleNames.includes(role));

    if (!allowed) {
      this.deny(request, user, requiredRoles, 'Insufficient permissions');
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private deny(
    request: {
      ip?: string;
      socket?: { remoteAddress?: string };
      method?: string;
      url?: string;
      originalUrl?: string;
    },
    user: { userId?: string; churchId?: string } | undefined,
    requiredRoles: string[],
    reason: string,
  ) {
    this.authzDenial.recordDenial({
      actorId: user?.userId ?? null,
      churchId: user?.churchId ?? null,
      ip: resolveClientIp(request),
      route: `${request.method ?? 'GET'} ${request.originalUrl ?? request.url ?? ''}`,
      reason,
      required: requiredRoles,
      gate: 'RolesGuard',
    });
  }
}
