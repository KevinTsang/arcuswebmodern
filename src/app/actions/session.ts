'use server';

import { cookies } from 'next/headers';

const COOKIE_NAME = 'arcus-session';
const SEVEN_DAYS = 60 * 60 * 24 * 7;
const THIRTY_MINUTES = 60 * 30;

/**
 * Set an HttpOnly session cookie on our domain so Next.js middleware
 * and server components can detect an authenticated user.
 */
export async function createSession(
  personId: string,
  placeId: string,
  isPublic = false,
): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify({ personId, placeId }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: isPublic ? THIRTY_MINUTES : SEVEN_DAYS,
  });
}

/**
 * Delete the session cookie (on logout).
 */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
