/**
 * API smoke test — Establishment (follow-up) endpoints for church admin.
 * Run: npx playwright test e2e/follow-up-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Establishment API smoke', () => {
  let headers: Record<string, string>;
  let leadId: string;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const statsRes = await request.get(`${API_URL}/follow-up/stats`, { headers });
    if (!statsRes.ok()) {
      test.skip(true, `Establishment API unavailable (${statsRes.status()})`);
    }
  });

  test('GET stats, assignees, templates, list', async ({ request }) => {
    for (const path of ['/follow-up/stats', '/follow-up/assignees', '/follow-up/templates', '/follow-up']) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
    const stats = await (await request.get(`${API_URL}/follow-up/stats`, { headers })).json();
    expect(stats).toHaveProperty('assigned');
    expect(stats).toHaveProperty('dueToday');
    expect(stats).toHaveProperty('graduated');
  });

  test('POST lead, PATCH stage, GET stage-audit', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/follow-up`, {
      headers,
      data: {
        contactName: `API Smoke Lead ${Date.now()}`,
        contactPhone: '07123456789',
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

    const auditRes = await request.get(`${API_URL}/follow-up/${leadId}/stage-audit`, { headers });
    expect(auditRes.ok()).toBeTruthy();
    const audits = await auditRes.json();
    expect(audits.length).toBeGreaterThanOrEqual(1);
    expect(audits[0].toStage).toBe('CONTACTED');
  });

  test('GET reminders and automation rules', async ({ request }) => {
    expect(leadId).toBeTruthy();
    const remindersRes = await request.get(`${API_URL}/follow-up/${leadId}/reminders`, { headers });
    expect(remindersRes.ok()).toBeTruthy();

    const rulesRes = await request.get(`${API_URL}/follow-up/automation-rules`, { headers });
    expect(rulesRes.ok()).toBeTruthy();
  });
});
