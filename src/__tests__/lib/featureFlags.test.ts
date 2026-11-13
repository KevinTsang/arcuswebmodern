import { isYearlySubscriptionEnabled } from '@/lib/featureFlags';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockGetConfig = jest.fn();

jest.mock('@arcus/core/config', () => ({ getConfig: () => mockGetConfig() }));

// ── Helpers ───────────────────────────────────────────────────────────

const BASE = { apiUrl: 'https://p.test', wsUrl: 'wss://p.test', version: '1.0' };

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('isYearlySubscriptionEnabled', () => {
  it('is true when the config enables yearly subscriptions', () => {
    mockGetConfig.mockReturnValue({ ...BASE, enableYearlySubscription: true });
    expect(isYearlySubscriptionEnabled()).toBe(true);
  });

  it('is false when the config disables them', () => {
    mockGetConfig.mockReturnValue({ ...BASE, enableYearlySubscription: false });
    expect(isYearlySubscriptionEnabled()).toBe(false);
  });

  it('is false when the flag is missing', () => {
    mockGetConfig.mockReturnValue(BASE);
    expect(isYearlySubscriptionEnabled()).toBe(false);
  });

  it('is false before the config is initialized', () => {
    mockGetConfig.mockImplementation(() => { throw new Error('Config not initialized'); });
    expect(isYearlySubscriptionEnabled()).toBe(false);
  });
});
