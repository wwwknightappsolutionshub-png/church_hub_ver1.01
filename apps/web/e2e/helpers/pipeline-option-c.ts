import type { APIRequestContext } from '@playwright/test';
import { API_URL } from './auth';

/**
 * Reset demo church to a clean Option C baseline for regression:
 * discard fork, resync system templates from seed, prefer winners_default.
 */
export async function resetPipelineOptionCDemo(
  request: APIRequestContext,
  headers: Record<string, string>,
) {
  await request.post(`${API_URL}/follow-up/pipeline/discard`, { headers, data: {} });
  for (const key of ['winners_default', 'simple_visitor'] as const) {
    const res = await request.post(`${API_URL}/follow-up/pipeline/templates/${key}/resync`, {
      headers,
      data: {},
    });
    if (!res.ok()) {
      throw new Error(`resync ${key} failed: ${res.status()} ${await res.text()}`);
    }
  }
  const base = await request.put(`${API_URL}/follow-up/pipeline/base-template`, {
    headers,
    data: { templateKey: 'winners_default' },
  });
  if (!base.ok()) {
    throw new Error(`base-template winners_default failed: ${base.status()} ${await base.text()}`);
  }
}
