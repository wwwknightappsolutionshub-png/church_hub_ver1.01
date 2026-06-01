import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessService } from '../access/module-access.service';
import { FOLLOW_UP_ACCESS_KEY, MODULE_GATE_KEY } from './decorators';

@Injectable()
export class FollowUpAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleGate = this.reflector.getAllAndOverride<string | undefined>(MODULE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (moduleGate) return true;

    const required = this.reflector.getAllAndOverride<boolean>(FOLLOW_UP_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId || !user?.churchId) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.moduleAccess.assertFollowUpAccess(
      user.userId,
      user.churchId,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'Follow-Up access requires church staff, evangelism/follow-up unit membership, or an approved discipleship role',
      );
    }
    return true;
  }
}
