/**
 * Remembers the page a signed-out user was trying to reach, so the login page
 * can send them back after they sign in (legacy app.js `nextPage`).
 *
 * Only AuthProvider writes the value, from the router's own location, so it
 * never carries user-supplied input and needs no URL validation. It lives in
 * sessionStorage (per tab), which can throw when storage is blocked; failures
 * fall back to the home page.
 */

const NEXT_PAGE_KEY = 'arcus:nextPage';

export function saveNextPage(path: string): void {
  try {
    sessionStorage.setItem(NEXT_PAGE_KEY, path);
  } catch {
    // Storage unavailable — login falls back to the home page.
  }
}

/** Returns the remembered page (or '/') and forgets it. */
export function takeNextPage(): string {
  try {
    const path = sessionStorage.getItem(NEXT_PAGE_KEY);
    sessionStorage.removeItem(NEXT_PAGE_KEY);
    return path || '/';
  } catch {
    return '/';
  }
}
