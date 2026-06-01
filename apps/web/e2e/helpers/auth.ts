import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';
export const E2E_EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@demo.church';
export const E2E_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'ChurchHub123!';
export const skipBrowser =
  process.env.SKIP_E2E === 'true' || process.env.SKIP_PLAYWRIGHT === 'true';

export async function loginToken(request: APIRequestContext): Promise<string> {
  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  if (!loginRes.ok()) {
    test.skip(true, `API login failed (${loginRes.status()}). Start API + seed.`);
  }
  const body = await loginRes.json();
  const token = body.accessToken as string;
  if (!token) {
    test.skip(true, 'No accessToken from login');
  }
  return token;
}

export async function authHeaders(request: APIRequestContext): Promise<Record<string, string>> {
  const token = await loginToken(request);
  return { Authorization: `Bearer ${token}` };
}

export async function seedAuth(
  page: Page,
  request: APIRequestContext,
  credentials?: { email?: string; password?: string },
): Promise<void> {
  const email = credentials?.email ?? E2E_EMAIL;
  const password = credentials?.password ?? E2E_PASSWORD;

  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email, password },
  });
  if (!loginRes.ok()) {
    test.skip(true, `API login failed (${loginRes.status()}). Start API + seed.`);
  }
  const body = await loginRes.json();
  const token = body.accessToken as string;
  if (!token) {
    test.skip(true, 'No accessToken from login');
  }

  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    {
      accessToken: token,
      refreshToken: (body.refreshToken as string) ?? '',
    },
  );
}

/** Skip the current test when a module API route is unavailable (e.g. stale API process). */
export async function skipUnlessApiOk(
  request: APIRequestContext,
  path: string,
  hint?: string,
): Promise<void> {
  const headers = await authHeaders(request);
  const res = await request.get(`${API_URL}${path}`, { headers });
  if (!res.ok()) {
    test.skip(
      true,
      hint ?? `API ${path} unavailable (${res.status()}). Restart API after pulling changes.`,
    );
  }
}

/** Assert login succeeds — for API-only specs that should fail loudly rather than skip. */
export async function assertLogin(request: APIRequestContext): Promise<Record<string, string>> {
  const loginRes = await request.post(`${API_URL}/auth/login`, {
    data: { email: E2E_EMAIL, password: E2E_PASSWORD },
  });
  expect(loginRes.ok(), `API login failed (${loginRes.status()})`).toBeTruthy();
  const { accessToken } = await loginRes.json();
  expect(accessToken).toBeTruthy();
  return { Authorization: `Bearer ${accessToken}` };
}
