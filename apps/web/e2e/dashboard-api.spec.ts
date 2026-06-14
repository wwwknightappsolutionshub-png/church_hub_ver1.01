/**
 * API smoke — dashboard attendance, church calendar, automation email templates.
 * Run: npx playwright test e2e/dashboard-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, skipUnlessApiOk } from './helpers/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Dashboard extensions API', () => {
  let headers: Record<string, string>;
  let calendarEventId: string;
  let customTemplateId: string;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    await skipUnlessApiOk(
      request,
      '/admin/attendance-performance',
      'Restart API after pulling dashboard module changes.',
    );
  });

  test('GET attendance performance from ushering headcounts', async ({ request }) => {
    const res = await request.get(`${API_URL}/admin/attendance-performance`, { headers });
    expect(res.ok(), `attendance-performance → ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('weeks');
    expect(body).toHaveProperty('summary');
    expect(body.source).toBeTruthy();
  });

  test('GET church calendar feed', async ({ request }) => {
    const from = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();
    const res = await request.get(
      `${API_URL}/church-calendar/feed?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(Array.isArray(body.items)).toBeTruthy();
  });

  test('POST calendar event with highlight', async ({ request }) => {
    const res = await request.post(`${API_URL}/church-calendar/events`, {
      headers,
      data: {
        title: `E2E Calendar ${Date.now()}`,
        startsAt: new Date().toISOString(),
        allDay: true,
        highlightColor: '#1e3a5f',
        isPinned: true,
      },
    });
    expect(res.ok(), `create event → ${res.status()}`).toBeTruthy();
    const event = await res.json();
    calendarEventId = event.id;
    expect(calendarEventId).toBeTruthy();
    expect(event.isPinned).toBe(true);
  });

  test('PATCH calendar event pin toggle', async ({ request }) => {
    expect(calendarEventId).toBeTruthy();
    const res = await request.patch(`${API_URL}/church-calendar/events/${calendarEventId}`, {
      headers,
      data: { isPinned: false, highlightColor: '#dc2626' },
    });
    expect(res.ok()).toBeTruthy();
    const event = await res.json();
    expect(event.isPinned).toBe(false);
  });

  test('DELETE calendar event', async ({ request }) => {
    expect(calendarEventId).toBeTruthy();
    const res = await request.delete(`${API_URL}/church-calendar/events/${calendarEventId}`, {
      headers,
    });
    expect(res.ok()).toBeTruthy();
  });

  test('GET automation email templates (5 branded defaults)', async ({ request }) => {
    const res = await request.get(`${API_URL}/automation/email-templates`, { headers });
    expect(res.ok(), `email-templates → ${res.status()}`).toBeTruthy();
    const templates = await res.json();
    expect(templates.length).toBeGreaterThanOrEqual(5);
    const codes = templates.map((t: { code: string }) => t.code);
    expect(codes).toContain('STAFF_WELCOME');
    expect(codes).toContain('ABSENTEE_FOLLOWUP');
    expect(codes).toContain('NEW_MEMBER_WELCOME');
    expect(codes).toContain('WEEKLY_DIGEST');
    expect(codes).toContain('EVENT_REMINDER');
    const staffWelcome = templates.find((t: { code: string }) => t.code === 'STAFF_WELCOME');
    expect(staffWelcome.bodyHtml).toContain('{{temporaryPassword}}');
    expect(staffWelcome.bodyHtml).toContain('{{email}}');
  });

  test('POST PATCH DELETE custom automation template', async ({ request }) => {
    const createRes = await request.post(`${API_URL}/automation/email-templates`, {
      headers,
      data: {
        name: `E2E Custom ${Date.now()}`,
        subject: 'Test subject {{churchName}}',
        bodyHtml: '<p>Custom body</p>',
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const created = await createRes.json();
    customTemplateId = created.id;

    const patchRes = await request.patch(`${API_URL}/automation/email-templates/${customTemplateId}`, {
      headers,
      data: { subject: 'Updated subject', isActive: false },
    });
    expect(patchRes.ok()).toBeTruthy();

    const deleteRes = await request.delete(
      `${API_URL}/automation/email-templates/${customTemplateId}`,
      { headers },
    );
    expect(deleteRes.ok()).toBeTruthy();
  });
});
