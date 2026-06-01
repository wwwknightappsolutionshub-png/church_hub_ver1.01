import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

export interface AuthUser {
  userId: string;
  churchId: string | null;
  email: string;
  roles?: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const ChurchId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const churchId = request.user?.churchId;
    if (!churchId) {
      throw new ForbiddenException(
        'This action requires a church workspace — platform admins use /platform routes',
      );
    }
    return churchId;
  },
);
