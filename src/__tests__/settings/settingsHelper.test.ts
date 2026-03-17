import { formatServiceLevel } from '@/components/settings/settingsHelper';

describe('formatServiceLevel', () => {
  it('formats known service levels', () => {
    expect(formatServiceLevel('BASIC')).toBe('Basic');
    expect(formatServiceLevel('PREMIUM')).toBe('Premium');
    expect(formatServiceLevel('PREMIUM_FREE')).toBe('Premium (Free)');
    expect(formatServiceLevel('PREMIUM_PROMON')).toBe('Premium + Pro Monitoring');
    expect(formatServiceLevel('PREMIUM_PROMON_FREE')).toBe('Premium + Pro Monitoring (Free)');
    expect(formatServiceLevel('PREMIUM_PROMON_MYARCUS')).toBe('Premium + Pro Monitoring Annual');
  });

  it('returns raw value for unknown levels', () => {
    expect(formatServiceLevel('CUSTOM')).toBe('CUSTOM');
  });

  it('returns dash for null/undefined', () => {
    expect(formatServiceLevel(null)).toBe('—');
    expect(formatServiceLevel(undefined)).toBe('—');
  });
});
