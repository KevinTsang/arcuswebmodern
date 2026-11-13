/**
 * Dashboard card preferences — ported from config/preferences.json and the
 * card handling in src/pages/home/home.js.
 *
 * The platform stores the card order and visibility per person per place in
 * the `dashboardCards` session preference, a list of `{ serviceName, hideCard }`
 * entries shared with the mobile apps. Subsystem cards are keyed by
 * `SubsystemConfigEntry.preferenceName`; two more entries cover the Favorites
 * card and the History sidebar.
 */

import type { CardPreference, Preferences } from '@arcus/core/services/types';
import {
  getSubsystemConfigByPreferenceName,
  type SubsystemPreferenceName,
} from '@/lib/subsystemConfig';

/** Preference key the dashboard card list is stored under. */
export const DASHBOARD_CARDS_PREF = 'dashboardCards';

/** Card key of the Favorites card. */
export const FAVORITES_CARD = 'FAVORITES';

/** Card key of the History sidebar; `hideCard` collapses the sidebar. */
export const HISTORY_CARD = 'HISTORY';

export type DashboardCardName = SubsystemPreferenceName | typeof FAVORITES_CARD | typeof HISTORY_CARD;

/** A `dashboardCards` entry whose card this client knows. */
export interface DashboardCardPreference extends CardPreference {
  serviceName: DashboardCardName;
}

/** Default card order for a person with no saved preference (legacy config/preferences.json). */
export const DEFAULT_DASHBOARD_CARDS: readonly DashboardCardPreference[] = [
  { serviceName: FAVORITES_CARD, hideCard: false },
  { serviceName: HISTORY_CARD, hideCard: false },
  { serviceName: 'LIGHTS_N_SWITCHES', hideCard: false },
  { serviceName: 'ALARMS', hideCard: false },
  { serviceName: 'CLIMATE', hideCard: false },
  { serviceName: 'DOORS_N_LOCKS', hideCard: false },
  { serviceName: 'CAMERAS', hideCard: false },
  { serviceName: 'CARE', hideCard: false },
  { serviceName: 'HOME_N_FAMILY', hideCard: false },
  { serviceName: 'LAWN_N_GARDEN', hideCard: false },
  { serviceName: 'WATER', hideCard: false },
];

function isDashboardCardName(name: string): name is DashboardCardName {
  return DEFAULT_DASHBOARD_CARDS.some((c) => c.serviceName === name);
}

/** Display label of a dashboard card. */
export function dashboardCardLabel(name: DashboardCardName): string {
  if (name === FAVORITES_CARD) return 'Favorites';
  if (name === HISTORY_CARD) return 'History';
  return getSubsystemConfigByPreferenceName(name)?.name ?? name;
}

/**
 * The full card list for the given preferences: the saved order first
 * (dropping unknown or repeated entries), then any card the saved list lacks,
 * in default order and visible. Falls back to the defaults when nothing is saved.
 */
export function resolveDashboardCards(preferences: Preferences | null | undefined): DashboardCardPreference[] {
  const saved = preferences?.dashboardCards;
  const cards: DashboardCardPreference[] = [];
  if (Array.isArray(saved)) {
    for (const card of saved) {
      const name = card?.serviceName;
      if (typeof name !== 'string' || !isDashboardCardName(name)) continue;
      if (cards.some((c) => c.serviceName === name)) continue;
      cards.push({ serviceName: name, hideCard: card.hideCard === true });
    }
  }
  for (const def of DEFAULT_DASHBOARD_CARDS) {
    if (!cards.some((c) => c.serviceName === def.serviceName)) {
      cards.push({ ...def });
    }
  }
  return cards;
}
