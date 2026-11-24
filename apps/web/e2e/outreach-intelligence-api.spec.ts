import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:4000/api/v1';

test.describe('Outreach intelligence API', () => {
  test('command-centre requires auth', async ({ request }) => {
    const res = await request.get(`${API_URL}/outreach/command-centre`);
    expect(res.status()).toBe(401);
  });

  test('duplicates requires auth', async ({ request }) => {
    const res = await request.get(`${API_URL}/outreach/duplicates?phone=%2B447123456789`);
    expect(res.status()).toBe(401);
  });
});