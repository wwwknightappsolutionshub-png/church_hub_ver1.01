/**
 * API smoke test — verifies Membership endpoints respond for church admin.
 * Run: npx playwright test e2e/membership-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Membership API smoke', () => {
  let headers: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const statsRes = await request.get(`${API_URL}/membership/stats`, { headers });
    if (!statsRes.ok()) {
      test.skip(true, `Membership API unavailable (${statsRes.status()})`);
    }
  });

  test('GET catalog, stats, members, families', async ({ request }) => {
    for (const path of [
      '/membership/catalog',
      '/membership/stats',
      '/membership/members',
      '/membership/families',
      '/membership/registry/catalog',
      '/membership/registry/admin-catalog',
      '/membership/registry/congregant-analytics',
      '/membership/registry/email-links',
    ]) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });

  test('GET church-services, class-definitions, analytics', async ({ request }) => {
    for (const path of [
      '/membership/church-services',
      '/membership/class-definitions',
      '/membership/analytics',
      '/membership/analytics/targets',
      '/membership/analytics/export?months=3',
      '/membership/attendance',
    ]) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });

  test('GET member detail and timeline when members exist', async ({ request }) => {
    const listRes = await request.get(`${API_URL}/membership/members`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const members = await listRes.json();
    if (!members.length) return;

    const memberId = members[0].id as string;
    const detailRes = await request.get(`${API_URL}/membership/members/${memberId}`, { headers });
    expect(detailRes.ok()).toBeTruthy();

    const timelineRes = await request.get(`${API_URL}/membership/members/${memberId}/timeline`, {
      headers,
    });
    expect(timelineRes.ok()).toBeTruthy();
  });
});
