/**
 * Shared helpers for Node load scripts.
 */

export function parseLoadEnv() {
  const API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';
  const TOKEN = process.env.ACCESS_TOKEN;
  const CONCURRENCY = parseInt(process.env.LOAD_CONCURRENCY ?? '10', 10);
  const REQUESTS = parseInt(process.env.LOAD_REQUESTS ?? '50', 10);
  const MAX_MS = parseInt(process.env.LOAD_MAX_MS ?? '30000', 10);
  return { API_URL, TOKEN, CONCURRENCY, REQUESTS, MAX_MS };
}

export function requireToken(TOKEN) {
  if (!TOKEN) {
    console.error('Set ACCESS_TOKEN (JWT from POST /api/v1/auth/login)');
    process.exit(1);
  }
}

export async function runLoad({ url, method = 'GET', body, headers = {}, CONCURRENCY, REQUESTS }) {
  const authHeaders = { ...headers, Authorization: headers.Authorization };

  async function oneRequest(i) {
    const start = Date.now();
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const ms = Date.now() - start;
    let ok = res.ok;
    if (ok && method !== 'GET') {
      try {
        await res.json();
      } catch {
        ok = false;
      }
    } else if (ok) {
      await res.text();
    }
    return { i, ok, status: res.status, ms };
  }

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
  const avg = times.reduce((a, b) => a + b, 0) / (times.length || 1);
  const max = times[times.length - 1] ?? 0;

  return {
    url,
    method,
    requests: REQUESTS,
    concurrency: CONCURRENCY,
    ok,
    fail: REQUESTS - ok,
    avgMs: Math.round(avg),
    p95Ms: p95,
    maxMs: max,
    statusSample: [...new Set(results.map((r) => r.status))].slice(0, 5),
  };
}

export function printSummary(summary) {
  console.log(JSON.stringify(summary, null, 2));
  if (summary.fail > 0) process.exitCode = 1;
}
