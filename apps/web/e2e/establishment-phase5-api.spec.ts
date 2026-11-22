/**
 * Phase 5 — Establishment API journey + access regression.
 * Capture → NEW_LEAD → assign → stage edits → audit → graduate.
 * Run: npx playwright test e2e/establishment-phase5-api.spec.ts
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin, authHeaders } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Establishment Phase 5 API journey', () => {
  let headers: Record<string, string>;
  let leadId: string;
  let assigneeId: string | undefined;
  const runId = Date.now().toString(36);
  const contactName = `P5 Journey ${runId}`;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
    const statsRes = await request.get(`${API_URL}/follow-up/stats`, { headers });
    if (!statsRes.ok()) {
      test.skip(true, `Establishment API unavailable (${statsRes.status()})`);
    }
  });

  test('stats include worker dashboard fields', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/stats`, { headers });
    expect(res.status(), 'stats status').toBe(200);
    const stats = await res.json();
    expect(stats).toHaveProperty('pending');
    expect(stats).toHaveProperty('overdue');
    expect(stats).toHaveProperty('dueToday');
    expect(stats).toHaveProperty('graduated');
    expect(stats).toHaveProperty('assigned');
    expect(stats).toHaveProperty('byStage');
    expect(stats.accessMode).toBe('manager');
  });

  test('outreach capture lands as NEW_LEAD', async ({ request }) => {
    const before = await (await request.get(`${API_URL}/follow-up/stats`, { headers })).json();
    const beforeNew = before.byStage?.NEW_LEAD ?? 0;

    const captureRes = await request.post(`${API_URL}/outreach/capture`, {
      headers,
      data: {
        firstName: 'Phase5',
        lastName: `Capture${runId}`,
        // UK mobile so capture schema does not require international address fields
        phone: `07${String(Date.now()).slice(-9)}`,
        email: `p5-capture-${runId}@example.com`,
        gdprConsent: true,
      },
    });
    expect(captureRes.ok(), `capture → ${captureRes.status()}`).toBeTruthy();
    const capture = await captureRes.json();
    expect(capture.id || capture.contact?.id || capture.outreachContactId).toBeTruthy();

    const listRes = await request.get(`${API_URL}/follow-up`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const match = (Array.isArray(list) ? list : []).find(
      (row: { contactName?: string; contactEmail?: string; stage?: string }) =>
        row.contactEmail === `p5-capture-${runId}@example.com` ||
        (row.contactName ?? '').includes(`Capture${runId}`),
    );
    expect(match, 'captured contact appears in Establishment list').toBeTruthy();
    expect(match.stage).toBe('NEW_LEAD');
    leadId = match.id;

    const after = await (await request.get(`${API_URL}/follow-up/stats`, { headers })).json();
    expect(after.byStage.NEW_LEAD).toBeGreaterThanOrEqual(beforeNew);
  });

  test('create New Contact + assign creates assignment notification', async ({ request }) => {
    const meRes = await request.get(`${API_URL}/auth/me`, { headers });
    expect(meRes.ok(), `auth/me → ${meRes.status()}`).toBeTruthy();
    const me = await meRes.json();
    const meId = me.id ?? me.userId ?? me.user?.id;

    const assigneesRes = await request.get(`${API_URL}/follow-up/assignees`, { headers });
    expect(assigneesRes.ok()).toBeTruthy();
    const assignees = await assigneesRes.json();
    expect(Array.isArray(assignees)).toBeTruthy();
    // Prefer self so /notifications/me can observe FOLLOW_UP_ASSIGNED
    assigneeId =
      (assignees as Array<{ id: string }>).find((a) => a.id === meId)?.id ??
      assignees[0]?.id;
    expect(assigneeId, 'at least one assignee').toBeTruthy();

    const createRes = await request.post(`${API_URL}/follow-up`, {
      headers,
      data: {
        contactName,
        contactPhone: '07123456789',
        contactEmail: `p5-lead-${runId}@example.com`,
        assignedToId: assigneeId,
      },
    });
    expect(createRes.ok(), `create → ${createRes.status()}`).toBeTruthy();
    const lead = await createRes.json();
    leadId = lead.id;
    expect(lead.stage).toBe('NEW_LEAD');
    expect(lead.assignedToId ?? lead.assignedTo?.id).toBe(assigneeId);

    const notifRes = await request.get(`${API_URL}/notifications/me`, { headers });
    expect(notifRes.ok(), `notifications/me → ${notifRes.status()}`).toBeTruthy();
    const payload = await notifRes.json();
    const rows = Array.isArray(payload)
      ? payload
      : payload?.notifications ?? payload?.items ?? payload?.data ?? [];
    const assigned = (Array.isArray(rows) ? rows : []).find(
      (n: { type?: string; title?: string; data?: { followUpId?: string } }) =>
        n.type === 'FOLLOW_UP_ASSIGNED' &&
        (n.data?.followUpId === leadId || (n.title ?? '').includes(contactName)),
    );
    if (assigneeId === meId) {
      expect(assigned, 'FOLLOW_UP_ASSIGNED notification present after self-assign').toBeTruthy();
    } else {
      expect(lead.assignedToId ?? lead.assignedTo?.id).toBe(assigneeId);
    }
  });

  test('worker-style stage advance writes stage audit', async ({ request }) => {
    expect(leadId).toBeTruthy();

    const stageRes = await request.patch(`${API_URL}/follow-up/${leadId}/stage`, {
      headers,
      data: {
        stage: 'CONTACTED',
        whatWasDone: 'Phase 5 e2e call completed',
        whatNext: 'Invite to Sunday service',
      },
    });
    expect(stageRes.ok(), `stage → ${stageRes.status()}`).toBeTruthy();

    const auditRes = await request.get(`${API_URL}/follow-up/${leadId}/stage-audit`, {
      headers,
    });
    expect(auditRes.ok(), `stage-audit → ${auditRes.status()}`).toBeTruthy();
    const audits = await auditRes.json();
    expect(Array.isArray(audits)).toBeTruthy();
    expect(audits.length).toBeGreaterThanOrEqual(1);
    const latest = audits[0];
    expect(latest.fromStage).toBe('NEW_LEAD');
    expect(latest.toStage).toBe('CONTACTED');
    expect(latest.actor?.id || latest.actorId).toBeTruthy();
    expect(latest.createdAt).toBeTruthy();
  });

  test('graduate to JOINED_GROUP increases graduated count', async ({ request }) => {
    expect(leadId).toBeTruthy();
    const before = await (await request.get(`${API_URL}/follow-up/stats`, { headers })).json();
    const beforeGrad = before.graduated ?? 0;

    for (const stage of ['VISITED', 'ATTENDED', 'JOINED_GROUP'] as const) {
      const res = await request.patch(`${API_URL}/follow-up/${leadId}/stage`, {
        headers,
        data: { stage, whatWasDone: `Advance to ${stage}`, whatNext: 'Continue' },
      });
      expect(res.ok(), `advance ${stage} → ${res.status()}`).toBeTruthy();
    }

    const detail = await (await request.get(`${API_URL}/follow-up/${leadId}`, { headers })).json();
    expect(detail.stage).toBe('JOINED_GROUP');

    const after = await (await request.get(`${API_URL}/follow-up/stats`, { headers })).json();
    expect(after.graduated).toBeGreaterThanOrEqual(beforeGrad + 1);

    const audits = await (
      await request.get(`${API_URL}/follow-up/${leadId}/stage-audit`, { headers })
    ).json();
    expect(audits.some((a: { toStage: string }) => a.toStage === 'JOINED_GROUP')).toBeTruthy();
  });

  test('unauthenticated Establishment stats are rejected', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/stats`);
    expect([401, 403]).toContain(res.status());
  });

  test('health endpoint responds for release gate', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.ok(), `health → ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.status === 'ok' || body.ok === true || body.status === 'healthy').toBeTruthy();
  });
});

test.describe('Establishment Phase 5 access regression (API)', () => {
  test('cross-church token cannot read foreign follow-up id shape', async ({ request }) => {
    // Without a second tenant in CI, assert church-scoped 404/403 on random UUID
    const headers = await authHeaders(request);
    const res = await request.get(
      `${API_URL}/follow-up/00000000-0000-4000-8000-000000000099`,
      { headers },
    );
    expect([403, 404]).toContain(res.status());
  });

  test('stage-audit for unknown id is 403 or 404', async ({ request }) => {
    const headers = await authHeaders(request);
    const res = await request.get(
      `${API_URL}/follow-up/00000000-0000-4000-8000-000000000099/stage-audit`,
      { headers },
    );
    expect([403, 404]).toContain(res.status());
  });
});
