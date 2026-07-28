import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
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
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PlatformPermissionKey | PlatformPermissionKey[]>(
      PLATFORM_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId as string | undefined;
    if (!userId) throw new ForbiddenException('Authentication required');

    await this.platformAccess.assertPlatformOperator(userId);

    const keys = Array.isArray(required) ? required : [required];
    for (const key of keys) {
      await this.platformAccess.assertPermission(userId, key);
    }
    return true;
  }
}
