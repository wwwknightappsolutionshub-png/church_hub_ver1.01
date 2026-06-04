/**
 * Dev-only demo auto-login (NEXT_PUBLIC_DEMO_MODE). Not imported by /login — keeps prod bundles clean.
 */
import { loginWithCredentials, type LoginResult } from '@/lib/auth-login';

const DEMO_EMAIL = 'admin@demo.church';
const DEMO_PASSWORD = 'ChurchHub123!';

export async function loginWithDemoCredentials(): Promise<LoginResult> {
  return loginWithCredentials(DEMO_EMAIL, DEMO_PASSWORD);
}
