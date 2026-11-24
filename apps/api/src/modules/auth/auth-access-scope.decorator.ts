import { SetMetadata } from '@nestjs/common';

export const AUTH_ACCESS_SCOPE_KEY = 'authAccessScope';

export type AuthAccessScope =
  | 'login'
  | 'login-2fa'
  | 'register-start'
  | 'register-verify'
  | 'forgot-password'
  | 'reset-password'
  | 'reset-validate'
  | 'reset-resend'
  | 'magic-link'
  | 'magic-consume'
  | 'refresh'
  | 'logout'
  | 'trial-redeem';

export const AuthAccessScope = (scope: AuthAccessScope) =>
  SetMetadata(AUTH_ACCESS_SCOPE_KEY, scope);