import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.module';
import { IS_PUBLIC_KEY } from './decorators';
import { ALLOW_MEMBER_OWNED_DELETE_KEY } from './destructive.decorators';

/**
 * All church-data DELETE handlers require ADMIN or PASTOR (or platform operator).
 * Opt out only via @Public() or @AllowMemberOwnedDelete().
 * @Roles including LEADER does NOT bypass this — Leaders cannot delete church data.
 */
@Injectable()
export class DestructiveOpsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (String(request.method || '').toUpperCase() !== 'DELETE') return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const allowMemberOwned = this.reflector.getAllAndOverride<boolean>(
      ALLOW_MEMBER_OWNED_DELETE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (allowMemberOwned) return true;

    const user = request.user;
    if (!user?.userId) throw new ForbiddenException('Authentication required');

    const userRoles = await this.prisma.userRole.findMany({
      where: { userId: user.userId },
      include: { role: true },
    });
    const roleNames = userRoles.map((ur) => ur.role.name);
    request.user.roles = roleNames;

    if (roleNames.includes('PLATFORM_ADMIN')) return true;
    if (userRoles.some((ur) => ur.role.scope === 'PLATFORM')) return true;
    if (roleNames.includes('ADMIN') || roleNames.includes('PASTOR')) return true;

    throw new ForbiddenException('Only Pastor or Admin may delete church data.');
  }
}
