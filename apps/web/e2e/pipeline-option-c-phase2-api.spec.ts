/**
 * Phase 2 — stage keys stored as strings; invalid stage rejected; archive blocked by flag.
 * Run: npx playwright test e2e/pipeline-option-c-phase2-api.spec.ts --project=chromium
 */
import { test, expect } from '@playwright/test';
import { API_URL, assertLogin } from './helpers/auth';
import { resetPipelineOptionCDemo } from './helpers/pipeline-option-c';

test.describe.configure({ mode: 'serial' });

test.describe('Pipeline Option C Phase 2 — stage keys + flags', () => {
  let headers: Record<string, string>;
  let leadId: string;

  test.beforeAll(async ({ request }) => {
    headers = await assertLogin(request);
    await resetPipelineOptionCDemo(request, headers);
  });

  test('create lead defaults to NEW_LEAD entry key', async ({ request }) => {
    const res = await request.post(`${API_URL}/follow-up`, {
      headers,
      data: {
        contactName: `P2 Key Lead ${Date.now()}`,
        contactPhone: `07${String(Date.now()).slice(-9)}`,
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const body = await res.json();
    expect(body.stage).toBe('NEW_LEAD');
    leadId = body.id;
  });

  test('rejects unknown pipeline stage key', async ({ request }) => {
    const res = await request.patch(`${API_URL}/follow-up/${leadId}/stage`, {
      headers,
      data: {
        stage: 'NOT_A_REAL_STAGE',
        whatWasDone: 'Trying invalid stage',
        whatNext: 'Should fail',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('advance to JOINED_GROUP then archive is blocked by flag', async ({ request }) => {
    for (const stage of ['CONTACTED', 'VISITED', 'ATTENDED', 'JOINED_GROUP']) {
      const res = await request.patch(`${API_URL}/follow-up/${leadId}/stage`, {
        headers,
        data: {
          stage,
          whatWasDone: `Moved to ${stage}`,
          whatNext: 'Continue',
        },
      });
      expect(res.ok(), `${stage} → ${res.status()} ${await res.text()}`).toBeTruthy();
    }

    const archive = await request.post(`${API_URL}/follow-up/${leadId}/archive`, {
      headers,
      data: { reason: 'Should not archive joined group' },
    });
    expect(archive.status()).toBe(400);
    const err = await archive.json().catch(() => ({}));
    expect(JSON.stringify(err)).toMatch(/cannot be archived|Convert/i);
  });
});
