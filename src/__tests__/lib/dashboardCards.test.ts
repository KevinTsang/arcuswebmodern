import { PresenceSubsystem } from '@arcus/core';
import type { Preferences } from '@arcus/core/services/types';
import {
  DEFAULT_DASHBOARD_CARDS, FAVORITES_CARD, HISTORY_CARD, dashboardCardLabel, resolveDashboardCards,
} from '@/lib/dashboardCards';
import { subsystemConfigs, getSubsystemConfigByPreferenceName } from '@/lib/subsystemConfig';

// ── Tests ─────────────────────────────────────────────────────────────

describe('DEFAULT_DASHBOARD_CARDS', () => {
  it('has the Favorites card, the History sidebar and one card per subsystem, all visible', () => {
    const names = DEFAULT_DASHBOARD_CARDS.map((c) => c.serviceName);
    expect(names.slice(0, 2)).toEqual([FAVORITES_CARD, HISTORY_CARD]);
    expect([...names.slice(2)].sort()).toEqual(subsystemConfigs.map((c) => c.preferenceName).sort());
    expect(DEFAULT_DASHBOARD_CARDS.every((c) => !c.hideCard)).toBe(true);
  });
});

describe('getSubsystemConfigByPreferenceName', () => {
  it('finds the subsystem of a dashboard card key', () => {
    expect(getSubsystemConfigByPreferenceName('DOORS_N_LOCKS')?.slug).toBe('doors-locks');
    expect(getSubsystemConfigByPreferenceName('HOME_N_FAMILY')?.namespace).toBe(PresenceSubsystem.NAMESPACE);
  });

  it('returns undefined for non-subsystem or unknown keys', () => {
    expect(getSubsystemConfigByPreferenceName(FAVORITES_CARD)).toBeUndefined();
    expect(getSubsystemConfigByPreferenceName('ENERGY')).toBeUndefined();
  });
});

describe('dashboardCardLabel', () => {
  it('labels the Favorites and History entries', () => {
    expect(dashboardCardLabel(FAVORITES_CARD)).toBe('Favorites');
    expect(dashboardCardLabel(HISTORY_CARD)).toBe('History');
  });

  it('uses the subsystem name for subsystem cards', () => {
    expect(dashboardCardLabel('LAWN_N_GARDEN')).toBe('Lawn & Garden');
  });
});

describe('resolveDashboardCards', () => {
  it('returns the defaults when nothing is saved', () => {
    expect(resolveDashboardCards(null)).toEqual(DEFAULT_DASHBOARD_CARDS);
    expect(resolveDashboardCards(undefined)).toEqual(DEFAULT_DASHBOARD_CARDS);
    expect(resolveDashboardCards({})).toEqual(DEFAULT_DASHBOARD_CARDS);
  });

  it('returns copies, not the default entries', () => {
    const cards = resolveDashboardCards(null);
    cards[0].hideCard = true;
    expect(DEFAULT_DASHBOARD_CARDS[0].hideCard).toBe(false);
  });

  it('keeps the saved order and visibility and appends missing cards', () => {
    const cards = resolveDashboardCards({
      dashboardCards: [
        { serviceName: 'WATER', hideCard: true },
        { serviceName: FAVORITES_CARD, hideCard: false },
      ],
    });
    expect(cards.slice(0, 3)).toEqual([
      { serviceName: 'WATER', hideCard: true },
      { serviceName: FAVORITES_CARD, hideCard: false },
      { serviceName: HISTORY_CARD, hideCard: false },
    ]);
    expect(cards).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
  });

  it('drops unknown, repeated and malformed entries', () => {
    const prefs = {
      dashboardCards: [
        { serviceName: 'ENERGY', hideCard: false },
        { serviceName: 'CARE', hideCard: true },
        { serviceName: 'CARE', hideCard: false },
        { hideCard: true },
        null,
      ],
    } as unknown as Preferences;
    const cards = resolveDashboardCards(prefs);
    expect(cards[0]).toEqual({ serviceName: 'CARE', hideCard: true });
    expect(cards.filter((c) => c.serviceName === 'CARE')).toHaveLength(1);
    expect(cards).toHaveLength(DEFAULT_DASHBOARD_CARDS.length);
  });

  it('treats a missing hideCard as visible', () => {
    const prefs = { dashboardCards: [{ serviceName: 'CLIMATE' }] } as unknown as Preferences;
    expect(resolveDashboardCards(prefs)[0]).toEqual({ serviceName: 'CLIMATE', hideCard: false });
  });

  it('ignores a dashboardCards value that is not a list', () => {
    const prefs = { dashboardCards: 'CLIMATE' } as unknown as Preferences;
    expect(resolveDashboardCards(prefs)).toEqual(DEFAULT_DASHBOARD_CARDS);
  });
});
