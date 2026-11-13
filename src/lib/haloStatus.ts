/**
 * Halo smoke/CO/weather device status.
 *
 * halo:devicestate is the detector's own condition (smoke, CO, a weather
 * alert from its radio, battery and end-of-life warnings).
 */

import { Halo } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

export type HaloSeverity = 'ok' | 'warning' | 'alert';

export interface HaloStatus {
  label: string;
  severity: HaloSeverity;
}

const OK: HaloStatus = { label: 'Ok', severity: 'ok' };

const STATES: Record<string, HaloStatus> = {
  [Halo.DEVICESTATE_SAFE]: OK,
  [Halo.DEVICESTATE_SMOKE]: { label: 'Smoke Detected', severity: 'alert' },
  [Halo.DEVICESTATE_CO]: { label: 'CO Detected', severity: 'alert' },
  [Halo.DEVICESTATE_PRE_SMOKE]: { label: 'Early Smoke Warning', severity: 'warning' },
  [Halo.DEVICESTATE_WEATHER]: { label: 'Weather Alert', severity: 'warning' },
  [Halo.DEVICESTATE_EOL]: { label: 'End of Life', severity: 'warning' },
  [Halo.DEVICESTATE_LOW_BATTERY]: { label: 'Low Battery', severity: 'warning' },
  [Halo.DEVICESTATE_VERY_LOW_BATTERY]: { label: 'Very Low Battery', severity: 'warning' },
  [Halo.DEVICESTATE_FAILED_BATTERY]: { label: 'Battery Failed', severity: 'warning' },
};

export function getHaloStatus(device: DeviceEntity | undefined): HaloStatus {
  const state = device?.[Halo.ATTR_DEVICESTATE] as string | undefined;
  return (state && STATES[state]) || OK;
}

/** "FAIL_CO_SENSOR" → "Fail Co Sensor", as the legacy test configurator showed it. */
export function formatHaloTestResult(result: string | undefined): string {
  if (!result) return 'Not tested';
  return result
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
