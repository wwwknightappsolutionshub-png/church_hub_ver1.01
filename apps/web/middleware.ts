import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Auth shells must never be cached (stale chunk hashes break login after deploy). */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.delete('CDN-Cache-Control');
  return response;
}

export const config = {
  matcher: ['/login', '/register', '/sw.js'],
};
