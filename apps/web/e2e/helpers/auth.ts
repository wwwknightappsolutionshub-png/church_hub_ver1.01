import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:4000/api/v1';
export const E2E_EMAIL = process.env.E2E_LOGIN_EMAIL ?? 'admin@demo.church';
export const E2E_PASSWORD = process.env.E2E_LOGIN_PASSWORD ?? 'ChurchHub123!';
export const skipBrowser =
  process.env.SKIP_E2E === 'true' || process.env.SKIP_PLAYWRIGHT === 'true';

const cwdApi = path.resolve(process.cwd(), '../api');
const API_ROOT = fs.existsSync(cwdApi)
  ? cwdApi
  : path.resolve(__dirname, '../../../api');

/** Mint JWT when password login requires admin/pastor 2FA (local e2e only). */
function mintAccessTokenViaApiScript(email: string): string | null {
  if (!process.env.JWT_ACCESS_SECRET || !process.env.DATABASE_URL) return null;
  const script = path.join(API_ROOT, 'scripts', 'mint-e2e-access-token.ts');
  try {
    const token = execFileSync(
      process.execPath,
      ['-r', 'ts-node/register/transpile-only', script, email],
      {
        cwd: API_ROOT,
        env: process.env,
        encoding: 'utf8',
        timeout: 60_000,
      },
    )
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .pop();
    return token && token.split('.').length === 3 ? token : null;
  } catch {
    try {
      const token = execFileSync(
        process.platform === 'win32' ? 'npx.cmd' : 'npx',
        ['ts-node', '--transpile-only', script, email],
        {
          cwd: API_ROOT,
          env: process.env,
          encoding: 'utf8',
          timeout: 60_000,
          shell: true,
        },
      )
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .pop();
      return token && token.split('.').length === 3 ? token : null;
    } catch {
      return null;
    }
  }
}

async function resolveAccessToken(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string | null> {
  try {
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      data: { email, password },
    });
    if (loginRes.ok()) {
      const body = await loginRes.json();
      if (typeof body.accessToken === 'string' && body.accessToken) {
        return body.accessToken;
      }
      if (body.requires2fa) {
        return mintAccessTokenViaApiScript(email);
      }
    }
  } catch {
    // fall through to mint
  }
  // Admin/pastor 2FA email may fail in local e2e — mint JWT when secrets are available.
  return mintAccessTokenViaApiScript(email);
}

export async function loginToken(request: APIRequestContext): Promise<string> {
  const token = await resolveAccessToken(request, E2E_EMAIL, E2E_PASSWORD);
  if (!token) {
    test.skip(
      true,
      'API login failed (or 2FA blocked without JWT_ACCESS_SECRET/DATABASE_URL mint). Start API + seed.',
    );
  }
  return token!;
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

  const token = await resolveAccessToken(request, email, password);
  if (!token) {
    test.skip(
      true,
      `API login failed for ${email} (or 2FA blocked without JWT mint env). Start API + seed.`,
    );
  }

  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    {
      accessToken: token!,
      refreshToken: '',
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
  const accessToken = await resolveAccessToken(request, E2E_EMAIL, E2E_PASSWORD);
  expect(
    accessToken,
    'API login failed (check API, seed, and JWT_ACCESS_SECRET/DATABASE_URL for 2FA mint)',
  ).toBeTruthy();
  return { Authorization: `Bearer ${accessToken}` };
}

export async function assertLoginAs(
  request: APIRequestContext,
  email: string,
  password = E2E_PASSWORD,
): Promise<Record<string, string>> {
  const accessToken = await resolveAccessToken(request, email, password);
  expect(accessToken, `API login failed for ${email}`).toBeTruthy();
  return { Authorization: `Bearer ${accessToken}` };
}
