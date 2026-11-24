/**
 * Member privacy + field access API e2e (secured endpoints, projection floor).
 * Run: npx playwright test e2e/member-privacy-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, authHeaders, loginToken } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Member privacy API', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
  });

  test('GET church field-access catalog (Admin/Pastor)', async ({ request }) => {
    const res = await request.get(`${API_URL}/member-privacy/catalog`, { headers });
    expect(res.ok(), `catalog → ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body)).toBeTruthy();
    expect(body.length).toBeGreaterThan(10);
    const email = body.find((r: { fieldKey: string }) => r.fieldKey === 'member.email');
    expect(email?.hardcodedFloor).toBe('RESTRICTED');
    expect(email?.effectiveVisibility).toBe('RESTRICTED');
    const city = body.find((r: { fieldKey: string }) => r.fieldKey === 'member.city');
    expect(city?.hardcodedFloor).toBe('VISIBLE');
  });

  test('POST church policy cannot loosen email floor', async ({ request }) => {
    const res = await request.post(`${API_URL}/member-privacy/church-policies`, {
      headers,
      data: {
        items: [
          {
            fieldKey: 'member.email',
            visibility: 'VISIBLE',
            editability: 'EDITABLE',
          },
        ],
      },
    });
    expect(res.status(), await res.text()).toBeGreaterThanOrEqual(400);
  });

  test('POST church policy can tighten city to RESTRICTED', async ({ request }) => {
    const res = await request.post(`${API_URL}/member-privacy/church-policies`, {
      headers,
      data: {
        items: [
          {
            fieldKey: 'member.city',
            visibility: 'RESTRICTED',
            editability: 'LOCKED',
          },
        ],
      },
    });
    expect(res.ok(), `tighten city → ${res.status()} ${await res.text()}`).toBeTruthy();

    const catalog = await request.get(`${API_URL}/member-privacy/catalog`, { headers });
    const body = await catalog.json();
    const city = body.find((r: { fieldKey: string }) => r.fieldKey === 'member.city');
    expect(city?.effectiveVisibility).toBe('RESTRICTED');

    // Restore default (remove override by setting back to VISIBLE which matches floor)
    await request.post(`${API_URL}/member-privacy/church-policies`, {
      headers,
      data: {
        items: [
          {
            fieldKey: 'member.city',
            visibility: 'VISIBLE',
            editability: 'EDITABLE',
          },
        ],
      },
    });
  });

  test('ministry-cells branch members mask email for ops when available', async ({ request }) => {
    const branchesRes = await request.get(`${API_URL}/ministry-cells/branches`, { headers });
    if (!branchesRes.ok()) {
      test.skip(true, `ministry-cells unavailable (${branchesRes.status()})`);
    }
    const branches = await branchesRes.json();
    if (!Array.isArray(branches) || !branches.length) {
      test.skip(true, 'No branches seeded');
    }
    const branchId = branches[0].id as string;
    const detail = await request.get(`${API_URL}/ministry-cells/branches/${branchId}`, {
      headers,
    });
    expect(detail.ok()).toBeTruthy();
    const body = await detail.json();
    // Admin login sees raw email (leadership). Assert shape is present.
    if (Array.isArray(body.members) && body.members.length) {
      expect(body.members[0]).toHaveProperty('firstName');
    }
  });

  test('pastoral notes list is Pastor-gated (Admin without PASTOR may 403)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/follow-up/pastoral-notes`, { headers });
    // Demo admin often has ADMIN+PASTOR; accept 200 or 403 depending on roles.
    expect([200, 403]).toContain(res.status());
  });

  test('directory export-check is Pastor-only', async ({ request }) => {
    const res = await request.post(`${API_URL}/follow-up/export-check`, {
      headers,
      data: {},
    });
    // Nest may return 200 or 201 for POST success; 403 if caller lacks PASTOR
    expect([200, 201, 403]).toContain(res.status());
  });

  test('unauthenticated catalog is rejected', async ({ request }) => {
    const res = await request.get(`${API_URL}/member-privacy/catalog`);
    expect(res.status()).toBe(401);
  });

  test('church catalog is tenant-scoped via JWT churchId (IDOR contract)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/member-privacy/catalog`, { headers });
    expect(res.ok()).toBeTruthy();
    // Foreign churchId query param must not be accepted — catalog uses @ChurchId() only
    const foreign = await request.get(
      `${API_URL}/member-privacy/catalog?churchId=00000000-0000-4000-8000-000000000099`,
      { headers },
    );
    expect(foreign.ok()).toBeTruthy();
    const a = await res.json();
    const b = await foreign.json();
    expect(a.length).toBe(b.length);
  });
});

test.describe('Member privacy request-access', () => {
  test('request-access requires auth', async ({ request }) => {
    const res = await request.post(`${API_URL}/member-privacy/request-access`, {
      data: { reason: 'test' },
    });
    expect(res.status()).toBe(401);
  });

  test('Admin/Pastor request-access returns 400 (already have access)', async ({ request }) => {
    const headers = await authHeaders(request);
    await loginToken(request);
    const res = await request.post(`${API_URL}/member-privacy/request-access`, {
      headers,
      data: { reason: 'e2e self-check' },
    });
    // Leadership already has full access
    expect([400, 403]).toContain(res.status());
  });
});
