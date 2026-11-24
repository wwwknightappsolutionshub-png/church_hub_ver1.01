import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthzDenialService } from '../../common/security/authz-denial.service';
import { resolveClientIp } from '../../common/security/client-ip';
import { ModuleAccessService } from '../access/module-access.service';
import { FOLLOW_UP_ACCESS_KEY, MODULE_GATE_KEY } from './decorators';

@Injectable()
export class FollowUpAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly moduleAccess: ModuleAccessService,
    private readonly authzDenial: AuthzDenialService,
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
      this.deny(request, user, 'Authentication required');
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.moduleAccess.assertFollowUpAccess(
      user.userId,
      user.churchId,
    );
    if (!allowed) {
      const reason =
        'Follow-Up access requires church staff, evangelism/follow-up unit membership, or an approved discipleship role';
      this.deny(request, user, reason);
      throw new ForbiddenException(reason);
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
    reason: string,
  ) {
    this.authzDenial.recordDenial({
      actorId: user?.userId ?? null,
      churchId: user?.churchId ?? null,
      ip: resolveClientIp(request),
      route: `${request.method ?? 'GET'} ${request.originalUrl ?? request.url ?? ''}`,
      reason,
      required: 'followUp',
      gate: 'FollowUpAccessGuard',
    });
  }
}
