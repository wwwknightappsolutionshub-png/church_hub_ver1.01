import type { Request } from 'express';

/**
 * Resolve client IP for audit / abuse detection.
 * Relies on Express `trust proxy` (see main.ts) — never prefer raw
 * `X-Forwarded-For` first-hop parsing, which clients can spoof when proxy trust is off.
 */
export function resolveClientIp(req: {
  ip?: string;
  socket?: { remoteAddress?: string };
}): string | null {
  const ip = (req.ip || req.socket?.remoteAddress || '').trim();
  if (!ip) return null;
  // Strip IPv6-mapped IPv4 prefix
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

export function resolveClientIpFromExpress(req: Request): string | null {
  return resolveClientIp(req);
}
