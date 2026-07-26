/** Roles that must complete email OTP after password or magic-link proof. */
export const LOGIN_2FA_ROLES = ['ADMIN', 'PASTOR', 'PLATFORM_ADMIN'] as const;

export type Login2faRole = (typeof LOGIN_2FA_ROLES)[number];

export function userRequiresLogin2fa(roleNames: string[]): boolean {
  const set = new Set(roleNames);
  return LOGIN_2FA_ROLES.some((r) => set.has(r));
}
