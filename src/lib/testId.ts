/**
 * Derive a stable `data-testid` fragment from a label, title or name, e.g.
 * "Doors & Locks" → "doors-locks". Keeps test ids readable and lets repeated
 * components (cards, rows, badges) stay distinguishable without DOM walking.
 */
export function testIdSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
