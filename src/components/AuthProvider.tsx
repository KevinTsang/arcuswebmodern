'use client';

/**
 * AuthProvider — attempts session restore on mount.
 *
 * Wraps the app and dispatches authenticateThunk to check for an
 * existing session cookie. While authenticating, shows a loading spinner.
 * On failure, redirects to /login.
 */

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authenticateThunk } from '@/store/thunks/authenticateThunk';

const PUBLIC_ROUTES = ['/login', '/create-account', '/invite'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const { authenticating, authenticated, sessionExpired } = useAppSelector((s) => s.auth);
  // Track whether authenticating has ever been true (thunk has started)
  const hasStartedAuth = useRef(false);
  if (authenticating) {
    hasStartedAuth.current = true;
  }

  useEffect(() => {
    if (!authenticated && !authenticating) {
      dispatch(authenticateThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Only redirect after the auth attempt has started and then completed
    if (!hasStartedAuth.current) return;
    if (!authenticating && !authenticated && !isPublicRoute(pathname)) {
      const params = new URLSearchParams();
      if (sessionExpired) {
        params.set('expired', '1');
      }
      if (pathname !== '/') {
        params.set('redirect', pathname);
      }
      const query = params.toString();
      router.replace(`/login${query ? `?${query}` : ''}`);
    }
  }, [authenticating, authenticated, sessionExpired, pathname, router]);

  // While authenticating (or before auth has started), show a loading state (unless on a public page)
  if (!authenticated && !isPublicRoute(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-grouse text-lg">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
