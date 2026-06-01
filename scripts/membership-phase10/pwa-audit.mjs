#!/usr/bin/env node
/**
 * Phase 10 PWA audit — manifest + service worker static checks.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webPublic = path.resolve(__dirname, '../../apps/web/public');

function auditManifest(manifest) {
  const issues = [];
  if (!manifest.name) issues.push('Missing name');
  if (!manifest.start_url) issues.push('Missing start_url');
  if (!manifest.display) issues.push('Missing display');
  if (!manifest.icons?.length) issues.push('Missing icons');
  return issues;
}

function auditSw(source) {
  const issues = [];
  if (!source.includes('install')) issues.push('Missing install');
  if (!source.includes('fetch')) issues.push('Missing fetch');
  if (!source.includes('caches')) issues.push('Missing caches');
  return issues;
}

const manifestPath = path.join(webPublic, 'manifest.json');
const swPath = path.join(webPublic, 'sw.js');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sw = fs.readFileSync(swPath, 'utf8');

const mIssues = auditManifest(manifest);
const sIssues = auditSw(sw);
const ok = mIssues.length === 0 && sIssues.length === 0;

console.log('Phase 10 PWA audit');
console.log('  manifest:', mIssues.length ? mIssues.join(', ') : 'OK');
console.log('  sw.js:', sIssues.length ? sIssues.join(', ') : 'OK');
process.exit(ok ? 0 : 1);
