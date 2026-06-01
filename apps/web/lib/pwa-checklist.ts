/** Pure PWA checklist checks for Phase 10 audits (no DOM). */

export interface PwaManifestInput {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  icons?: Array<{ src?: string; sizes?: string }>;
}

export interface PwaAuditResult {
  ok: boolean;
  issues: string[];
}

export function auditManifest(manifest: PwaManifestInput): PwaAuditResult {
  const issues: string[] = [];
  if (!manifest.name?.trim()) issues.push('Missing manifest.name');
  if (!manifest.start_url?.trim()) issues.push('Missing manifest.start_url');
  if (!manifest.display) issues.push('Missing manifest.display');
  if (!manifest.icons?.length) issues.push('Missing manifest.icons');
  return { ok: issues.length === 0, issues };
}

export function auditServiceWorkerSource(source: string): PwaAuditResult {
  const issues: string[] = [];
  if (!source.includes('install')) issues.push('SW missing install handler');
  if (!source.includes('fetch')) issues.push('SW missing fetch handler');
  if (!source.includes('caches')) issues.push('SW missing Cache API usage');
  return { ok: issues.length === 0, issues };
}
