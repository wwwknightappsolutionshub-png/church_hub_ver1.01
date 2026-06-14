/** Seeded credentials — must match `apps/api/prisma/test-accounts.ts` + `seed-platform-admin.ts`. */
export const TEST_LOGIN_PASSWORD = 'ChurchHub123!';

export const LOGIN_TEST_ACCOUNTS = [
  {
    id: 'platform',
    title: 'Super Admin / SaaS Owner',
    email: 'platform@churchhub.com',
    password: TEST_LOGIN_PASSWORD,
    hint: 'Platform console — all churches, not tied to one congregation.',
  },
  {
    id: 'church-staff',
    title: 'Church Admin / Pastor',
    email: 'admin@demo.church',
    password: TEST_LOGIN_PASSWORD,
    hint: 'Full church workspace (membership, modules). Pastor: pastor@demo.church — same password.',
  },
] as const;

/** Show on login in local/dev unless explicitly hidden. */
export function showLoginTestAccounts(): boolean {
  if (process.env.NEXT_PUBLIC_HIDE_TEST_LOGINS === 'true') return false;
  return process.env.NODE_ENV !== 'production';
}
