import { userRequiresLogin2fa } from './login-2fa.constants';

describe('userRequiresLogin2fa', () => {
  it('requires 2FA for ADMIN, PASTOR, and PLATFORM_ADMIN', () => {
    expect(userRequiresLogin2fa(['ADMIN'])).toBe(true);
    expect(userRequiresLogin2fa(['PASTOR'])).toBe(true);
    expect(userRequiresLogin2fa(['PLATFORM_ADMIN'])).toBe(true);
    expect(userRequiresLogin2fa(['MEMBER', 'ADMIN'])).toBe(true);
  });

  it('does not require 2FA for other roles', () => {
    expect(userRequiresLogin2fa(['MEMBER'])).toBe(false);
    expect(userRequiresLogin2fa(['LEADER', 'DRIVER'])).toBe(false);
    expect(userRequiresLogin2fa([])).toBe(false);
  });
});
