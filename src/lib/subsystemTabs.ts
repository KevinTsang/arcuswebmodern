/**
 * Route-driven sub-tabs of the subsystem views: /services/<slug>/<action>.
 *
 * The single list of a subsystem's tabs. Views render them with
 * `SubsystemTabs`, and the services route builds its static params from them,
 * so adding a tab here is enough for both (the app is a static export, so a
 * tab missing from the static params would 404).
 */

export interface SubsystemTab {
  action: string;
  label: string;
}

/** The tab every subsystem opens on. */
export const DEFAULT_SUBSYSTEM_ACTION = 'status';

export const SUBSYSTEM_TABS = {
  alarms: [
    { action: 'status', label: 'Status' },
    { action: 'settings', label: 'Settings' },
  ],
  'doors-locks': [
    { action: 'status', label: 'Status' },
    { action: 'access-list', label: 'Access List' },
    { action: 'more', label: 'More' },
  ],
} as const satisfies Record<string, readonly SubsystemTab[]>;

export type SubsystemWithTabs = keyof typeof SUBSYSTEM_TABS;

/** The actions of a subsystem's tabs other than the default, for the route's static params. */
export function extraSubsystemActions(slug: string): string[] {
  const tabs: readonly SubsystemTab[] | undefined = (SUBSYSTEM_TABS as Record<string, readonly SubsystemTab[]>)[slug];
  return (tabs ?? []).map((t) => t.action).filter((a) => a !== DEFAULT_SUBSYSTEM_ACTION);
}

/** `action` if it's one of the subsystem's tabs, otherwise the default tab. */
export function resolveSubsystemAction<S extends SubsystemWithTabs>(
  slug: S,
  action: string | undefined,
): (typeof SUBSYSTEM_TABS)[S][number]['action'] {
  const tabs = SUBSYSTEM_TABS[slug] as readonly SubsystemTab[];
  const match = tabs.find((t) => t.action === action);
  return (match?.action ?? DEFAULT_SUBSYSTEM_ACTION) as (typeof SUBSYSTEM_TABS)[S][number]['action'];
}
