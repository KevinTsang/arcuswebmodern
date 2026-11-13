import { isAlarmsRoute, isPairingFlowRoute } from '@/lib/pairingRoutes';

// ── Tests ─────────────────────────────────────────────────────────────

describe('isPairingFlowRoute', () => {
  it.each(['/pairing', '/product-catalog', '/kit-activate', '/hub-setup', '/product-catalog/brands'])(
    'is true for %s',
    (pathname) => {
      expect(isPairingFlowRoute(pathname)).toBe(true);
    },
  );

  it.each(['/', '/home', '/devices', '/services/alarms/status', '/pairings', '/product-catalogue'])(
    'is false for %s',
    (pathname) => {
      expect(isPairingFlowRoute(pathname)).toBe(false);
    },
  );
});

describe('isAlarmsRoute', () => {
  it.each(['/services/alarms', '/services/alarms/status', '/services/alarms/history'])('is true for %s', (pathname) => {
    expect(isAlarmsRoute(pathname)).toBe(true);
  });

  it.each(['/services', '/services/climate', '/services/alarmsettings', '/pairing'])('is false for %s', (pathname) => {
    expect(isAlarmsRoute(pathname)).toBe(false);
  });
});
