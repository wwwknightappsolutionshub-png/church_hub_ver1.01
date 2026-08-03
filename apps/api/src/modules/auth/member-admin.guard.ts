import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipAccessService } from '../membership/membership-access.service';
import { MEMBER_ADMIN_KEY, MEMBER_CREATE_KEY } from './decorators';

@Injectable()
export class MemberAdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly membershipAccess: MembershipAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresMemberAdmin = this.reflector.getAllAndOverride<boolean>(MEMBER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiresMemberCreate = this.reflector.getAllAndOverride<boolean>(MEMBER_CREATE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiresMemberAdmin && !requiresMemberCreate) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.userId || !user?.churchId) {
      throw new ForbiddenException('Authentication required');
    }

    if (requiresMemberCreate) {
      const canCreate = await this.membershipAccess.canCreateMembers(
        user.userId,
        user.churchId,
      );
      if (!canCreate) {
        throw new ForbiddenException(
          'Adding congregants requires an active church account',
        );
      }
      return true;
    }

    const allowed = await this.membershipAccess.canManageMembers(
      user.userId,
      user.churchId,
    );

    if (!allowed) {
      throw new ForbiddenException(
        'Membership changes require Church Admin, Pastor, or a Member profile with the Admin role',
      );
    }

    return true;
  }
}
