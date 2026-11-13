/**
 * NOAA weather alert catalog — ported from config/weatheralerts.json.
 *
 * Weather radios report the active alert as a three-letter EAS (Emergency
 * Alert System) event code in `noaa:currentalert` and store the codes a user
 * wants to hear in `noaa:alertsofinterest`. This table turns those codes into
 * readable names and marks the ones the legacy client listed as "popular".
 */

export interface WeatherAlertDefinition {
  /** Three-letter EAS event code, e.g. `TOR`. */
  code: string;
  /** Readable name, e.g. `Tornado Warning`. */
  description: string;
  /** Shown in the "Popular Alerts" group of the alert picker. */
  popular: boolean;
}

export const WEATHER_ALERTS: readonly WeatherAlertDefinition[] = [
  { code: 'AVA', description: 'Avalanche Watch', popular: false },
  { code: 'AVW', description: 'Avalanche Warning', popular: false },
  { code: 'BZW', description: 'Blizzard Warning', popular: false },
  { code: 'CFA', description: 'Coastal Flood Watch', popular: false },
  { code: 'CFW', description: 'Coastal Flood Warning', popular: false },
  { code: 'DSW', description: 'Dust Storm Warning', popular: false },
  { code: 'EQW', description: 'Earthquake Warning', popular: true },
  { code: 'FFA', description: 'Flash Flood Watch', popular: false },
  { code: 'FFS', description: 'Flash Flood Statement', popular: false },
  { code: 'FFW', description: 'Flash Flood Warning', popular: true },
  { code: 'FLA', description: 'Flash Watch', popular: false },
  { code: 'FLS', description: 'Flood Statement', popular: false },
  { code: 'FLW', description: 'Flood Warning', popular: false },
  { code: 'FRW', description: 'Fire Warning', popular: false },
  { code: 'FSW', description: 'Flash Freeze Warning', popular: false },
  { code: 'FZW', description: 'Freeze Warning', popular: false },
  { code: 'HLS', description: 'Hurricane Local Statement', popular: false },
  { code: 'HUA', description: 'Hurricane Watch', popular: false },
  { code: 'HUW', description: 'Hurricane Warning', popular: true },
  { code: 'HWA', description: 'High Wind Watch', popular: false },
  { code: 'HWW', description: 'High Wind Warning', popular: true },
  { code: 'SPS', description: 'Special Weather Statement', popular: false },
  { code: 'SVA', description: 'Severe Thunderstorm Watch', popular: false },
  { code: 'SVR', description: 'Severe Thunderstorm Warning', popular: true },
  { code: 'SVS', description: 'Severe Weather Statement', popular: false },
  { code: 'TOA', description: 'Tornado Watch', popular: false },
  { code: 'TOR', description: 'Tornado Warning', popular: true },
  { code: 'TRA', description: 'Tropical Storm Watch', popular: false },
  { code: 'TRW', description: 'Tropical Storm Warning', popular: true },
  { code: 'TSA', description: 'Tsunami Watch', popular: false },
  { code: 'TSW', description: 'Tsunami Warning', popular: false },
  { code: 'VOW', description: 'Volcano Warning', popular: false },
  { code: 'WSA', description: 'Winter Storm Watch', popular: false },
  { code: 'WSW', description: 'Winter Storm Warning', popular: true },
  { code: 'ADR', description: 'Administrative Message', popular: false },
  { code: 'NIC', description: 'National Information Center Statement', popular: false },
  { code: 'NMN', description: 'Network Message Notification', popular: false },
  { code: 'CAE', description: 'Child Abduction Emergency', popular: false },
  { code: 'LAE', description: 'Local Area Emergency', popular: false },
  { code: 'TOE', description: '911 Telephone Outage Emergency', popular: false },
  { code: 'DMO', description: 'Demonstration Message', popular: false },
  { code: 'NAT', description: 'National Audible Test', popular: false },
  { code: 'NPT', description: 'National Periodic Test', popular: false },
  { code: 'NST', description: 'National Silent Test', popular: false },
  { code: 'RMT', description: 'Required Monthly Test', popular: false },
  { code: 'RWT', description: 'Required Weekly Test', popular: false },
  { code: 'CDW', description: 'Civil Danger Warning', popular: false },
  { code: 'CEM', description: 'Civil Emergency Message', popular: false },
  { code: 'EAN', description: 'Emergency Action Notification', popular: false },
  { code: 'EAT', description: 'Emergency Action Termination', popular: false },
  { code: 'EVI', description: 'Evacuation Immediate', popular: false },
  { code: 'HMW', description: 'Hazardous Materials Warning', popular: false },
  { code: 'NUW', description: 'Nuclear Power Plant Warning', popular: false },
  { code: 'RHW', description: 'Radiological Hazard Warning', popular: false },
  { code: 'SPW', description: 'Shelter In-place Warning', popular: false },
  { code: 'LEW', description: 'Law Enforcement Warning', popular: false },
  { code: 'SMW', description: 'Special Marine Warning', popular: false },
  { code: '??S', description: 'Unrecognized Statement', popular: false },
  { code: '??M', description: 'Unrecognized Message', popular: false },
  { code: '??E', description: 'Unrecognized Emergency', popular: false },
  { code: '??A', description: 'Unrecognized Watch', popular: false },
  { code: '??W', description: 'Unrecognized Warning', popular: false },
  { code: 'BHW', description: 'Biological Hazard Warning', popular: false },
  { code: 'BWW', description: 'Boil Water Warning', popular: false },
  { code: 'CHW', description: 'Chemical Hazard Warning', popular: false },
  { code: 'CWW', description: 'Contaminated Water Warning', popular: false },
  { code: 'DBA', description: 'Dam Watch', popular: false },
  { code: 'DBW', description: 'Dam Break Warning', popular: false },
  { code: 'DEW', description: 'Contagious Disease Warning', popular: false },
  { code: 'EVA', description: 'Evacuation Watch', popular: false },
  { code: 'FCW', description: 'Food Contamination Warning', popular: false },
  { code: 'IBW', description: 'Iceberg Warning', popular: false },
  { code: 'IFW', description: 'Industrial Fire Warning', popular: false },
  { code: 'LSW', description: 'Land Slide Warning', popular: false },
  { code: 'POS', description: 'Power Outage Advisory', popular: false },
  { code: 'WFA', description: 'Wild Fire Watch', popular: false },
  { code: 'WFW', description: 'Wild Fire Warning', popular: false },
  { code: 'EWW', description: 'Extreme Wind Warning', popular: false },
  { code: 'SSA', description: 'Storm Surge Watch', popular: false },
  { code: 'SSW', description: 'Storm Surge Warning', popular: false },
];

const ALERTS_BY_CODE = new Map(WEATHER_ALERTS.map((a) => [a.code, a]));

/** Weather radios report this in `noaa:currentalert` when no alert is active. */
export const NO_WEATHER_ALERT = 'NONE';

/**
 * Readable name for an EAS code. Unknown codes fall back to the code itself,
 * capitalised the way the legacy client did (`XYZ` → `Xyz`).
 */
export function getWeatherAlertDescription(code: string | undefined): string {
  if (!code || code === NO_WEATHER_ALERT) return 'Weather Alert';
  const known = ALERTS_BY_CODE.get(code);
  if (known) return known.description;
  return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();
}

/** Alert definitions sorted by readable name. */
export function sortAlertsByDescription(alerts: readonly WeatherAlertDefinition[]): WeatherAlertDefinition[] {
  return [...alerts].sort((a, b) => a.description.localeCompare(b.description));
}

/** Formats an alert timestamp as e.g. `Jan 22, 2018 at 10:02 AM`. */
export function formatWeatherAlertTime(timestamp: number | undefined): string {
  if (!timestamp) return 'Unknown time';
  const date = new Date(timestamp);
  const day = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}
