/**
 * Validates a post-login `?redirect=` target.
 *
 * Only same-origin destinations are allowed. Parsing with URL (rather than
 * checking for a leading "/") also rejects the forms browsers resolve to
 * another origin: "//host", "/\host", and paths with embedded tabs/newlines.
 */
export function safeRedirectPath(
  target: string | null,
  origin: string = window.location.origin,
  fallback = '/',
): string {
  if (!target) return fallback;
  try {
    const url = new URL(target, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
