import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BUS_DRIVER_KEY } from '../auth/decorators';
import { BusAccessService } from './bus-access.service';

@Injectable()
export class BusDriverGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly busAccess: BusAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresDriver = this.reflector.getAllAndOverride<boolean>(BUS_DRIVER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiresDriver) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId || !user?.churchId) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.busAccess.canOperateDriverEndpoints(
      user.userId,
      user.churchId,
    );
    if (!allowed) {
      throw new ForbiddenException('Church staff or active bus driver profile required');
    }
    return true;
  }
}
