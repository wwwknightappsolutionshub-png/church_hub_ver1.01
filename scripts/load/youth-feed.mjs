/**
 * Load test — youth feed list endpoint.
 * Usage: node scripts/load/youth-feed.mjs
 * Env: API_URL, ACCESS_TOKEN, CHURCH_ID (optional)
 */
const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const TOKEN = process.env.ACCESS_TOKEN;
const CONCURRENCY = parseInt(process.env.LOAD_CONCURRENCY ?? '20', 10);
const REQUESTS = parseInt(process.env.LOAD_REQUESTS ?? '200', 10);

if (!TOKEN) {
  console.error('Set ACCESS_TOKEN (JWT from login)');
  process.exit(1);
}

const url = `${API_URL}/youth/feed/posts?limit=20`;

async function oneRequest(i) {
  const start = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const ms = Date.now() - start;
  return { i, ok: res.ok, status: res.status, ms };
}

async function run() {
  const results = [];
  let inFlight = 0;
  let index = 0;

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
  const avg = times.reduce((a, b) => a + b, 0) / times.length;

  console.log(JSON.stringify({ requests: REQUESTS, ok, fail: REQUESTS - ok, avgMs: Math.round(avg), p95Ms: p95 }, null, 2));
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
