/**
 * Environment configuration for the Arcus Web UI.
 * Maps values from the original config/development.json and config/production.json.
 *
 * In Next.js, environment variables are set via .env files and accessed via process.env.
 * NEXT_PUBLIC_ prefix exposes them to the browser.
 */

export interface ArcusConfig {
  apiUrl: string;
  wsUrl: string;
  redirectUrl: string;
  version: string;
  isProduction: boolean;
  iosDownloadUrl: string;
  androidDownloadUrl: string;
  enableYearlySubscription: boolean;
  enableHubWifiScan: boolean;
}

function getConfig(): ArcusConfig {
  const isProduction = process.env.NODE_ENV === 'production';
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '2018.10.2';

  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://dev.myDevUrl.com',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'wss://dev.myDevUrl.com',
    redirectUrl: process.env.NEXT_PUBLIC_REDIRECT_URL || 'https://dev.myDevUrl.com',
    version: isProduction ? version : `${version}-preprod`,
    isProduction,
    iosDownloadUrl: process.env.NEXT_PUBLIC_IOS_DOWNLOAD_URL || 'https://itunes.apple.com',
    androidDownloadUrl: process.env.NEXT_PUBLIC_ANDROID_DOWNLOAD_URL || 'https://play.google.com/store/apps',
    enableYearlySubscription: process.env.NEXT_PUBLIC_ENABLE_YEARLY_SUBSCRIPTION === '1',
    enableHubWifiScan: process.env.NEXT_PUBLIC_ENABLE_HUB_WIFI_SCAN === '1',
  };
}

const config = getConfig();
export default config;
