#!/usr/bin/env node
/**
 * Phase 10 security audit — dependency audit + env hygiene checks.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

let failed = false;

console.log('Phase 10 security audit\n');

try {
  console.log('→ pnpm audit (high+) at repo root…');
  execSync('pnpm audit --audit-level high', { cwd: root, stdio: 'inherit' });
} catch {
  console.warn('  pnpm audit reported vulnerabilities or is unavailable — review manually.');
  failed = true;
}

const envExample = path.join(root, 'apps/api/.env.example');
if (fs.existsSync(envExample)) {
  const content = fs.readFileSync(envExample, 'utf8');
  if (!content.includes('JWT_SECRET')) {
    console.warn('  .env.example should document JWT_SECRET');
    failed = true;
  } else {
    console.log('→ .env.example documents JWT_SECRET: OK');
  }
}

const mainTs = path.join(root, 'apps/api/src/main.ts');
if (fs.existsSync(mainTs) && fs.readFileSync(mainTs, 'utf8').includes('helmet')) {
  console.log('→ Helmet middleware present: OK');
} else {
  console.warn('  Helmet not found in main.ts — verify security headers');
  failed = true;
}

console.log(failed ? '\nSecurity audit: REVIEW REQUIRED' : '\nSecurity audit: PASSED (static checks)');
process.exit(failed ? 1 : 0);
