#!/usr/bin/env node
/**
 * Phase 10 Lighthouse — run against membership routes when server is up.
 * Requires: npx lighthouse (optional global install)
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=http://localhost:3001 node scripts/membership-phase10/lighthouse-membership.mjs
 */
import { spawnSync } from 'child_process';

const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001';
const routes = [
  '/dashboard/membership',
  '/dashboard/analytics',
  '/dashboard/automation',
];

const chromeFlags = '--chrome-flags="--headless --no-sandbox"';

for (const route of routes) {
  const url = `${base}${route}`;
  console.log(`\nLighthouse: ${url}`);
  const result = spawnSync(
    'npx',
    [
      'lighthouse',
      url,
      '--only-categories=performance,accessibility,best-practices,pwa',
      '--output=html',
      `--output-path=./lighthouse-reports/membership${route.replace(/\//g, '-')}.html`,
      '--quiet',
    ],
    { stdio: 'inherit', shell: true },
  );
  if (result.status !== 0) {
    console.warn(`  Skipped or failed for ${url} (is web dev server running?)`);
  }
}

console.log('\nReports written to ./lighthouse-reports/ when successful.');
