import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_ACCESS_SCOPE_KEY,
  type AuthAccessScope,
} from './auth-access-scope.decorator';
import { AuthAccessLimitService } from './auth-access-limit.service';
import { clientIpFromRequest } from './auth-client-ip.util';

@Injectable()
export class AuthAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: AuthAccessLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const scope = this.reflector.getAllAndOverride<AuthAccessScope | undefined>(
      AUTH_ACCESS_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!scope) return true;

    const req = context.switchToHttp().getRequest();
    const ip = clientIpFromRequest(req);
    await this.limits.assertAccessAllowed(ip, scope);
    return true;
  }
}