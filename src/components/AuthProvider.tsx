'use client';

/**
 * AuthProvider — attempts session restore on mount.
 *
 * Wraps the app and dispatches authenticateThunk to check for an
 * existing session cookie. While authenticating, shows a loading spinner.
 * On failure, redirects to /login.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { authenticateThunk } from '@/store/thunks/loginThunk';

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
  const { authenticating, authenticated } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!authenticated && !authenticating) {
      dispatch(authenticateThunk());
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // If authentication finished and failed, redirect to login (unless already on public route)
    if (!authenticating && !authenticated && !isPublicRoute(pathname)) {
      router.replace('/login');
    }
  }, [authenticating, authenticated, pathname, router]);

  // While authenticating, show a loading state (unless on a public page)
  if (authenticating && !isPublicRoute(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-grouse text-lg">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
