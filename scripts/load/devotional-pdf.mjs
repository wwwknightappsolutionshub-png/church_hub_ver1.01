/**
 * Load test — Devotional PDF import + process + simplify pipeline.
 * Usage: ACCESS_TOKEN=... node scripts/load/devotional-pdf.mjs
 *
 * Creates one import, then hammers GET status + POST simplify (uses stub PDF text).
 */
import { parseLoadEnv, printSummary, requireToken } from './_load-utils.mjs';

const { API_URL, TOKEN, CONCURRENCY, REQUESTS } = parseLoadEnv();
requireToken(TOKEN);

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
};

const registerRes = await fetch(`${API_URL}/devotional-hub/pdf/imports`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    fileName: `load-test-${Date.now()}.pdf`,
    fileUrl: 'https://example.com/sample-devotional.pdf',
  }),
});

if (!registerRes.ok) {
  console.error('Failed to register PDF import', registerRes.status, await registerRes.text());
  process.exit(1);
}

const { id: importId } = await registerRes.json();

await fetch(`${API_URL}/devotional-hub/pdf/imports/${importId}/process`, {
  method: 'POST',
  headers,
});

const simplifyUrl = `${API_URL}/devotional-hub/pdf/imports/${importId}/simplify`;
const getUrl = `${API_URL}/devotional-hub/pdf/imports/${importId}`;

const results = [];
let inFlight = 0;
let index = 0;

async function oneRequest(i) {
  const start = Date.now();
  const useSimplify = i % 2 === 0;
  const url = useSimplify ? simplifyUrl : getUrl;
  const res = await fetch(url, {
    method: useSimplify ? 'POST' : 'GET',
    headers,
    body: useSimplify
      ? JSON.stringify({ readingLevel: 'YOUTH', pageNumber: 1 })
      : undefined,
  });
  const ms = Date.now() - start;
  return { i, ok: res.ok, status: res.status, ms, op: useSimplify ? 'simplify' : 'get' };
}

await new Promise((resolve) => {
  const pump = () => {
    while (inFlight < CONCURRENCY && index < REQUESTS) {
      const i = index++;
      inFlight++;
      oneRequest(i)
        .then((r) => results.push(r))
        .finally(() => {
          inFlight--;
          if (results.length === REQUESTS) resolve();
          else pump();
        });
    }
  };
  pump();
});

const ok = results.filter((r) => r.ok).length;
const times = results.map((r) => r.ms).sort((a, b) => a - b);
const p95 = times[Math.floor(times.length * 0.95)] ?? 0;

printSummary({
  importId,
  requests: REQUESTS,
  concurrency: CONCURRENCY,
  ok,
  fail: REQUESTS - ok,
  avgMs: Math.round(times.reduce((a, b) => a + b, 0) / (times.length || 1)),
  p95Ms: p95,
  ops: ['get-import', 'simplify'],
});
