import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuleAccessService } from '../access/module-access.service';
import { MODULE_GATE_KEY, type ModuleGateType } from './decorators';

const GATE_MESSAGES: Record<ModuleGateType, string> = {
  followUp:
    'Follow-Up requires church staff, a follow-up/evangelism unit, or an approved discipleship role.',
  serviceUnitHub:
    'Service Unit Hub requires an active membership (New Member, Active Member, or Discipled) or service unit assignment.',
  profile:
    'My Profile requires a linked member record beyond Visitor status (New Member, Active Member, or Discipled).',
  busMinistry:
    'Bus ministry requires church staff, an active membership, or a driver role.',
  youth:
    'Youth Hub requires church staff, a youth role, youth group membership, or a parent link.',
  communications:
    'Communication Hub requires church staff or an active church membership.',
  communityHub:
    'Community Hub requires church staff or an active church membership.',
};

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly moduleAccess: ModuleAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gate = this.reflector.getAllAndOverride<ModuleGateType | undefined>(MODULE_GATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!gate) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId || !user?.churchId) {
      throw new ForbiddenException('Authentication required');
    }

    let allowed = false;
    switch (gate) {
      case 'followUp':
        allowed = await this.moduleAccess.assertFollowUpAccess(user.userId, user.churchId);
        break;
      case 'serviceUnitHub':
        allowed = await this.moduleAccess.assertServiceUnitHubAccess(user.userId, user.churchId);
        break;
      case 'profile':
        allowed = await this.moduleAccess.assertMyProfileAccess(user.userId, user.churchId);
        break;
      case 'busMinistry':
        allowed = await this.moduleAccess.assertBusMinistryAccess(user.userId, user.churchId);
        break;
      case 'youth':
        allowed = await this.moduleAccess.assertYouthAccess(user.userId, user.churchId);
        break;
      case 'communications':
        allowed = await this.moduleAccess.assertCommunicationsAccess(user.userId, user.churchId);
        break;
      case 'communityHub':
        allowed = await this.moduleAccess.assertCommunityHubAccess(user.userId, user.churchId);
        break;
    }

    if (!allowed) {
      throw new ForbiddenException(GATE_MESSAGES[gate]);
    }
    return true;
  }
}
