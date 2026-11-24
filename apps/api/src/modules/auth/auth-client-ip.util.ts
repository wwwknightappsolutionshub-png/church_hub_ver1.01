import type { Request } from 'express';

/** Client IP for rate limiting — relies on Express `trust proxy` + X-Forwarded-For from Nginx. */
export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]!.trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}