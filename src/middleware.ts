/**
 * Next.js Middleware — route auth guard.
 *
 * Checks for the session cookie set by the Arcus platform login endpoint.
 * If no cookie is present, redirects to /login for protected routes.
 *
 * Note: This is a lightweight check. The real auth validation happens
 * client-side via AuthProvider + authenticateThunk (WebSocket session).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/create-account', '/invite', '/api'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, static files, and Next.js internals
  if (
    isPublicPath(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (set by platform login endpoint)
  // The cookie name varies by deployment; check common names
  const hasSession =
    request.cookies.has('irisAuthToken') ||
    request.cookies.has('arcusAuthToken') ||
    request.cookies.has('session');

  if (!hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
