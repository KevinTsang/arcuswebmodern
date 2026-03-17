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
