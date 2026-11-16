import { Place } from '@arcus/core';

/**
 * Service plan catalog, ported from the legacy client's config/plans.json.
 *
 * The open-source Arcus platform has no billing backend, so prices are not
 * shown: a plan change only changes what the place can use.
 */

/** Service add-ons a place can carry (platform `ServiceAddon` enum). */
export const SERVICE_ADDON_CELLBACKUP = 'CELLBACKUP';

const ADDON_NAMES: Record<string, string> = {
  [SERVICE_ADDON_CELLBACKUP]: 'Cellular Backup',
};

const PLAN_NAMES: Record<string, string> = {
  [Place.SERVICELEVEL_BASIC]: 'Basic',
  [Place.SERVICELEVEL_PREMIUM]: 'Premium',
  [Place.SERVICELEVEL_PREMIUM_FREE]: 'Premium (Free)',
  [Place.SERVICELEVEL_PREMIUM_ANNUAL]: 'Premium Annual',
  [Place.SERVICELEVEL_PREMIUM_PROMON]: 'Professional Monitoring',
  [Place.SERVICELEVEL_PREMIUM_PROMON_FREE]: 'Professional Monitoring (Free)',
  [Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL]: 'Professional Monitoring Annual',
};

const PROMON_LEVELS: readonly string[] = [
  Place.SERVICELEVEL_PREMIUM_PROMON,
  Place.SERVICELEVEL_PREMIUM_PROMON_FREE,
  Place.SERVICELEVEL_PREMIUM_PROMON_ANNUAL,
];

const PREMIUM_LEVELS: readonly string[] = [
  Place.SERVICELEVEL_PREMIUM,
  Place.SERVICELEVEL_PREMIUM_FREE,
  Place.SERVICELEVEL_PREMIUM_ANNUAL,
];

/** A plan the owner can switch to from Settings. */
export interface SelectablePlan {
  level: string;
  name: string;
  summary: string;
}

/**
 * Plans an owner can pick directly. Pro Monitoring isn't here: the platform
 * only moves a place onto a Pro Monitoring level through the enrollment
 * wizard (its UpdateServicePlan refuses it), so the panel links there instead.
 */
export const SELECTABLE_PLANS: readonly SelectablePlan[] = [
  {
    level: Place.SERVICELEVEL_BASIC,
    name: 'Basic',
    summary: 'Unlimited devices, rules, scenes and schedules, with a 1-day history log and alarm notifications for 1 person.',
  },
  {
    level: Place.SERVICELEVEL_PREMIUM,
    name: 'Premium',
    summary: 'Everything in Basic, plus Care, Alarm Tracker, a 14-day history log and alarm notifications for up to 6 people.',
  },
];

/** Features a place loses when it drops from a premium plan to Basic. */
export const PREMIUM_FEATURES = [
  'Care behaviors that watch over your loved ones',
  'Alarm Tracker',
  '14 days of history (Basic keeps 1 day)',
  'Alarm notifications for up to 6 people (Basic notifies 1)',
] as const;

export function planName(level: string | undefined | null): string {
  if (!level) return '—';
  return PLAN_NAMES[level] ?? level;
}

export function addonName(addon: string): string {
  return ADDON_NAMES[addon] ?? addon;
}

export function isPromonLevel(level: string | undefined | null): boolean {
  return !!level && PROMON_LEVELS.includes(level);
}

/** Premium or Pro Monitoring: the place has the premium feature set. */
export function isPremiumLevel(level: string | undefined | null): boolean {
  return !!level && (PREMIUM_LEVELS.includes(level) || isPromonLevel(level));
}

export function isBasicLevel(level: string | undefined | null): boolean {
  return level === Place.SERVICELEVEL_BASIC;
}
