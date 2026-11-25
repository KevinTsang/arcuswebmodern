/**
 * Shared date and time formatting, so the same kind of timestamp reads the
 * same way everywhere in the app. Formats use the viewer's locale.
 *
 * Add new formats here rather than calling `toLocaleString` in components.
 * PRD item 32 tracks moving the remaining component-level formatters here.
 */

const SHORT_DATE_TIME: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

/**
 * A short date and time for activity entries, e.g. `Nov 24, 3:05 PM` in
 * en-US. Takes a millisecond timestamp.
 */
export function formatShortDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, SHORT_DATE_TIME);
}
