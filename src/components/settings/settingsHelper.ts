import type { SessionPlace } from '@/arcus/types';

export function formatServiceLevel(level: string | undefined | null): string {
  switch (level) {
    case 'BASIC':
      return 'Basic';
    case 'PREMIUM':
      return 'Premium';
    case 'PREMIUM_FREE':
      return 'Premium (Free)';
    case 'PREMIUM_PROMON':
      return 'Premium + Pro Monitoring';
    case 'PREMIUM_PROMON_FREE':
      return 'Premium + Pro Monitoring (Free)';
    case 'PREMIUM_PROMON_MYARCUS':
      return 'Premium + Pro Monitoring Annual';
    default:
      return level ?? '—';
  }
}

export function formatRole(role: string): string {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'FULL_ACCESS':
      return 'Full Access';
    case 'HOBBIT':
      return 'Partial Access';
    default:
      return role || '—';
  }
}

/**
 * The signed-in person's own account id — the account of any place where
 * they are the account owner (role OWNER). A person owns at most one account,
 * so every OWNER place carries the same id. Undefined for guest-only users.
 */
export function getOwnAccountId(places: SessionPlace[]): string | undefined {
  return places.find((p) => p.role === 'OWNER')?.accountId;
}
