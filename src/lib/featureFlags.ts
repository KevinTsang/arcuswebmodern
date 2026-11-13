import { getConfig } from '@arcus/core/config';

/**
 * Whether annual service plans are offered (legacy's ARCUS_ENABLE_YEARLY_SUBSCRIPTION,
 * read from server.json by initializeCoreConfig). Off until the config has loaded.
 */
export function isYearlySubscriptionEnabled(): boolean {
  try {
    return getConfig().enableYearlySubscription === true;
  } catch {
    return false;
  }
}
