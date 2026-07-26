import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';
test.describe.configure({ mode: 'serial' });

test.describe('Ministry/Cells API smoke', () => {
  let headers: Record<string, string>;
  let branchId: string;
  let formId: string;
  let teachingId: string;
  let prayerId: string;
  let memberId: string;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    const ctx = await request.get(`${API_URL}/ministry-cells/context`, { headers });
    if (!ctx.ok()) {
      test.skip(true, `Ministry/Cells API unavailable (${ctx.status()})`);
    }
  });

  test('GET context, branches, forms, teaching, leaders, reminders', async ({ request }) => {
    for (const path of [
      '/ministry-cells/context',
      '/ministry-cells/branches',
      '/ministry-cells/forms',
      '/ministry-cells/teaching',
      '/ministry-cells/leader-candidates',
      '/ministry-cells/reminders',
    ]) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });

  test('POST branch rejects invalid postcode and missing name → 400', async ({ request }) => {
    const badPostcode = await request.post(`${API_URL}/ministry-cells/branches`, {
      headers,
      data: { name: 'Validation Cell', postcode: 'NOTAPOSTCODE' },
    });
    expect(badPostcode.status()).toBe(400);

    const missingName = await request.post(`${API_URL}/ministry-cells/branches`, {
      headers,
      data: { name: '  ', postcode: 'N1 1AA' },
    });
    expect(missingName.status()).toBe(400);
  });

  test('POST branch, forms seed, teaching, reminder', async ({ request }) => {
    const branchRes = await request.post(`${API_URL}/ministry-cells/branches`, {
      headers,
      data: {
        name: `API Smoke Branch ${Date.now()}`,
        location: 'Smoke test',
        postcode: 'N1 1AA',
      },
    });
    expect(branchRes.ok()).toBeTruthy();
    const branch = await branchRes.json();
    branchId = branch.id;

    const seedRes = await request.post(`${API_URL}/ministry-cells/forms/seed-defaults`, {
      headers,
    });
    expect(seedRes.ok()).toBeTruthy();

    const formsRes = await request.get(`${API_URL}/ministry-cells/forms`, { headers });
    const forms = await formsRes.json();
    expect(forms.length).toBeGreaterThan(0);
    formId = forms[0].id;

    const teachRes = await request.post(`${API_URL}/ministry-cells/teaching`, {
      headers,
      data: { title: 'API Smoke Lesson', content: 'body' },
    });
    expect(teachRes.ok()).toBeTruthy();
    teachingId = (await teachRes.json()).id;

    const remRes = await request.post(`${API_URL}/ministry-cells/reminders`, {
      headers,
      data: {
        title: 'API Smoke Reminder',
        remindAt: new Date(Date.now() + 86400000).toISOString(),
        branchId,
      },
    });
    expect(remRes.ok()).toBeTruthy();
  });

  test('branch sub-resources: members, reports, attendance, incidents, prayers, messages', async ({
    request,
  }) => {
    expect(branchId).toBeTruthy();

    const availRes = await request.get(
      `${API_URL}/ministry-cells/available-members?branchId=${branchId}`,
      { headers },
    );
    expect(availRes.ok()).toBeTruthy();
    const available = await availRes.json();
    if (available.length > 0) {
      memberId = available[0].id;
      const addRes = await request.post(
        `${API_URL}/ministry-cells/branches/${branchId}/members`,
        { headers, data: { memberId } },
      );
      expect(addRes.ok()).toBeTruthy();
    }

    const detailRes = await request.get(`${API_URL}/ministry-cells/branches/${branchId}`, {
      headers,
    });
    expect(detailRes.ok()).toBeTruthy();

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    const attRes = await request.post(`${API_URL}/ministry-cells/branches/${branchId}/attendance`, {
      headers,
      data: { weekStart: weekStart.toISOString(), presentCount: 5 },
    });
    expect(attRes.ok()).toBeTruthy();

    const reportRes = await request.post(
      `${API_URL}/ministry-cells/branches/${branchId}/reports`,
      { headers, data: { formId, payload: { attendance: 5 } } },
    );
    expect(reportRes.ok()).toBeTruthy();

    const prayerRes = await request.post(
      `${API_URL}/ministry-cells/branches/${branchId}/prayers`,
      { headers, data: { title: 'API Smoke Prayer' } },
    );
    expect(prayerRes.ok()).toBeTruthy();
    prayerId = (await prayerRes.json()).id;

    for (const path of [
      `/ministry-cells/branches/${branchId}/reports`,
      `/ministry-cells/branches/${branchId}/attendance`,
      `/ministry-cells/branches/${branchId}/incidents`,
      `/ministry-cells/branches/${branchId}/prayers`,
      `/ministry-cells/branches/${branchId}/messages`,
      `/ministry-cells/branches/${branchId}/contacts`,
    ]) {
      const res = await request.get(`${API_URL}${path}`, { headers });
      expect(res.ok(), `${path} → ${res.status()}`).toBeTruthy();
    }
  });

  test('PATCH prayer, teaching; GET analytics; cleanup', async ({ request }) => {
    if (prayerId) {
      const patchRes = await request.patch(`${API_URL}/ministry-cells/prayers/${prayerId}`, {
        headers,
        data: { status: 'ANSWERED' },
      });
      expect(patchRes.ok()).toBeTruthy();
    }

    if (teachingId) {
      const patchRes = await request.post(`${API_URL}/ministry-cells/teaching`, {
        headers,
        data: { id: teachingId, title: 'API Smoke Lesson Updated' },
      });
      expect(patchRes.ok()).toBeTruthy();

      const delRes = await request.delete(`${API_URL}/ministry-cells/teaching/${teachingId}`, {
        headers,
      });
      expect(delRes.ok()).toBeTruthy();
    }

    const analyticsRes = await request.get(
      `${API_URL}/ministry-cells/analytics?from=2020-01-01&to=2030-01-01`,
      { headers },
    );
    expect(analyticsRes.ok()).toBeTruthy();

    if (memberId) {
      await request.delete(
        `${API_URL}/ministry-cells/branches/${branchId}/members/${memberId}`,
        { headers },
      );
    }

    if (branchId) {
      const delBranch = await request.delete(`${API_URL}/ministry-cells/branches/${branchId}`, {
        headers,
      });
      expect(delBranch.ok()).toBeTruthy();
    }
  });
});
