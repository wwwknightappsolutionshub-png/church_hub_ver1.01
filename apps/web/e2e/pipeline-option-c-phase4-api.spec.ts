/**
 * Phase 4 — Outreach capture → entry stage; convert advance syncs follow-up via flags.
 * Run: npx playwright test e2e/pipeline-option-c-phase4-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 4 — outreach → pipeline flags', () => {
  let headers: Record<string, string>;
  let outreachId: string;
  let followUpId: string;
  const runId = Date.now();

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('resolve pipeline exposes entry + graduatesSla flags', async ({ request }) => {
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    // After Phase 5 fork, source becomes `definition`; template is fine pre-fork.
    expect(['template', 'definition']).toContain(body.source);
    const entry = body.stages.find((s: { isEntry: boolean }) => s.isEntry);
    expect(entry?.key).toBe('NEW_LEAD');
    const graduated = body.stages.filter((s: { graduatesSla: boolean }) => s.graduatesSla);
    expect(graduated.map((s: { key: string }) => s.key)).toEqual(
      expect.arrayContaining(['JOINED_GROUP', 'ENLISTED_FOR_BAPTISM']),
    );
  });

  test('outreach capture creates follow-up at entry stage', async ({ request }) => {
    const captureRes = await request.post(`${API_URL}/outreach/capture`, {
      headers,
      data: {
        firstName: 'P4',
        lastName: `Capture${runId}`,
        phone: `07${String(Date.now()).slice(-9)}`,
        email: `p4-capture-${runId}@example.com`,
        gdprConsent: true,
      },
    });
    expect(captureRes.ok(), await captureRes.text()).toBeTruthy();
    const capture = await captureRes.json();
    outreachId = capture.id ?? capture.contact?.id ?? capture.outreachContactId;
    expect(outreachId).toBeTruthy();

    const listRes = await request.get(`${API_URL}/follow-up`, { headers });
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    const match = (Array.isArray(list) ? list : []).find(
      (row: { contactEmail?: string; contactName?: string }) =>
        row.contactEmail === `p4-capture-${runId}@example.com` ||
        (row.contactName ?? '').includes(`Capture${runId}`),
    );
    expect(match, 'captured contact in Establishment').toBeTruthy();
    expect(match.stage).toBe('NEW_LEAD');
    followUpId = match.id;
  });

  test('outreach convert advance syncs follow-up stage via flag map', async ({ request }) => {
    expect(outreachId).toBeTruthy();
    expect(followUpId).toBeTruthy();

    const advance = await request.patch(`${API_URL}/outreach/contacts/${outreachId}/pipeline`, {
      headers,
      data: { convertStage: 'CONTACTED' },
    });
    expect(advance.ok(), await advance.text()).toBeTruthy();

    const fu = await request.get(`${API_URL}/follow-up/${followUpId}`, { headers });
    expect(fu.ok()).toBeTruthy();
    const body = await fu.json();
    expect(body.stage).toBe('CONTACTED');
  });

  test('PDF export options include resolved stage labels (smoke via pipeline)', async ({
    request,
  }) => {
    const res = await request.get(`${API_URL}/follow-up/pipeline`, { headers });
    const body = await res.json();
    const keys = body.stages.map((s: { key: string }) => s.key);
    expect(keys).toEqual(
      expect.arrayContaining(['NEW_LEAD', 'CONTACTED', 'JOINED_GROUP']),
    );
    expect(body.stages.every((s: { label: string }) => !!s.label)).toBeTruthy();
  });
});
