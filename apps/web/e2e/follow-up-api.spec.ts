/**
 * API smoke test — verifies Outreach (follow-up) endpoints respond for church admin.
 * Run: npx playwright test e2e/follow-up-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Outreach API smoke', () => {
  let headers: Record<string, string>;
  let leadId: string;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const statsRes = await request.get(`${API_URL}/follow-up/stats`, { headers });
    if (!statsRes.ok()) {
      test.skip(true, `Outreach API unavailable (${statsRes.status()})`);
    }
  });

  test('GET stats, assignees, templates, list', async ({ request }) => {
    for (const path of ['/follow-up/stats', '/follow-up/assignees', '/follow-up/templates', '/follow-up']) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });

  test('POST lead and PATCH stage', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/follow-up`, {
      headers,
      data: {
        contactName: `API Smoke Lead ${Date.now()}`,
        contactPhone: '555-0199',
        contactEmail: `smoke-${Date.now()}@example.com`,
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const lead = await createRes.json();
    leadId = lead.id;
    expect(leadId).toBeTruthy();

    const stageRes = await request.patch(`${API_URL}/follow-up/${leadId}/stage`, {
      headers,
      data: { stage: 'CONTACTED', notes: 'API smoke test' },
    });
    expect(stageRes.ok()).toBeTruthy();

    const detailRes = await request.get(`${API_URL}/follow-up/${leadId}`, { headers });
    expect(detailRes.ok()).toBeTruthy();
    const detail = await detailRes.json();
    expect(detail.stage).toBe('CONTACTED');
  });

  test('GET reminders and automation rules', async ({ request }) => {
    expect(leadId).toBeTruthy();
    const remindersRes = await request.get(`${API_URL}/follow-up/${leadId}/reminders`, { headers });
    expect(remindersRes.ok()).toBeTruthy();

    const rulesRes = await request.get(`${API_URL}/follow-up/automation-rules`, { headers });
    expect(rulesRes.ok()).toBeTruthy();
  });
});
