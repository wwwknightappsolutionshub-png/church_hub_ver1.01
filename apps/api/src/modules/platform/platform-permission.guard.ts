import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzDenialService } from '../../common/security/authz-denial.service';
import { resolveClientIp } from '../../common/security/client-ip';
import {
  PLATFORM_PERMISSION_KEY,
} from '../auth/decorators';
import type { PlatformPermissionKey } from './platform-permissions.catalog';
import { PlatformAccessService } from './platform-access.service';

@Injectable()
export class PlatformPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly platformAccess: PlatformAccessService,
    private readonly authzDenial: AuthzDenialService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PlatformPermissionKey | PlatformPermissionKey[]>(
      PLATFORM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
    const churchId = request.user?.churchId as string | undefined;
    const keys = Array.isArray(required) ? required : [required];

    const deny = (reason: string) => {
      this.authzDenial.recordDenial({
        actorId: userId ?? null,
        churchId: churchId ?? null,
        ip: resolveClientIp(request),
        route: `${request.method ?? 'GET'} ${request.originalUrl ?? request.url ?? ''}`,
        reason,
        required: keys,
        gate: 'PlatformPermissionGuard',
      });
    };

    if (!userId) {
      deny('Authentication required');
      throw new ForbiddenException('Authentication required');
    }

    try {
      await this.platformAccess.assertPlatformOperator(userId);
      for (const key of keys) {
        await this.platformAccess.assertPermission(userId, key);
      }
    } catch (err) {
      if (err instanceof ForbiddenException) {
        deny(err.message);
      }
      throw err;
    }
    return true;
  }
}
