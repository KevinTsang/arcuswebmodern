/**
 * Configuration module for @arcus/core.
 *
 * Unlike the original src/config.js which relied on window.System.env,
 * this module accepts explicit configuration values.
 */

export interface ArcusCoreConfig {
  apiUrl: string;
  wsUrl: string;
  redirectUrl: string;
  version: string;
  isProduction: boolean;
  iosDownloadUrl?: string;
  androidDownloadUrl?: string;
  enableYearlySubscription?: boolean;
  enableHubWifiScan?: boolean;
}

let _config: ArcusCoreConfig | null = null;

export function setConfig(config: ArcusCoreConfig): void {
  _config = config;
}

export function getConfig(): ArcusCoreConfig {
  if (!_config) {
    throw new Error(
      '@arcus/core: Config not initialized. Call setConfig() before using the library.',
    );
  }
  return _config;
}
