#!/usr/bin/env node
/**
 * Phase 11 — deployment readiness checks (API + web build artifacts).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

const requiredApiEnv = ['DATABASE_URL', 'JWT_SECRET'];
const optionalApiEnv = ['REDIS_ENABLED', 'CORS_ORIGIN'];

let failed = 0;

function check(name, ok, detail) {
  console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
}

console.log('Phase 11 — Deployment readiness\n');

const apiEnv = path.join(root, 'apps/api/.env.example');
if (fs.existsSync(apiEnv)) {
  const text = fs.readFileSync(apiEnv, 'utf8');
  for (const key of requiredApiEnv) {
    check(`Documented ${key}`, text.includes(key));
  }
} else {
  check('apps/api/.env.example exists', false);
}

check('Web manifest.json', fs.existsSync(path.join(root, 'apps/web/public/manifest.json')));
check('Service worker v2', fs.readFileSync(path.join(root, 'apps/web/public/sw.js'), 'utf8').includes('STATIC_CACHE'));
check('Offline fallback page', fs.existsSync(path.join(root, 'apps/web/app/offline/page.tsx')));
check('Next standalone output', fs.readFileSync(path.join(root, 'apps/web/next.config.js'), 'utf8').includes('standalone'));
check('Browserslist config', fs.existsSync(path.join(root, '.browserslistrc')));

const healthPath = path.join(root, 'apps/api/src/modules/health');
check('Health module', fs.existsSync(healthPath));

console.log('\nOptional env (production):');
for (const key of optionalApiEnv) {
  console.log(`  · ${key}`);
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll static readiness checks passed');
console.log('Run with services up: curl http://localhost:4000/api/v1/health');
process.exit(failed ? 1 : 0);
