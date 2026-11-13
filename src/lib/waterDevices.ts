/**
 * Helpers for water heaters, water softeners and flow-monitoring devices.
 *
 * Ported from the legacy client's Device model getters
 * (`web:watersoftener:*`) and the water heater / EcoWater components.
 */

import {
  AOSmithWaterHeaterController, EcowaterWaterSoftener, WaterHeater, WaterSoftener,
} from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Temperature ───────────────────────────────────────────────────────

/** Celsius (platform) to whole Fahrenheit (display). */
export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

/** Fahrenheit (display) to Celsius (platform). */
export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

// ── Water heater ──────────────────────────────────────────────────────

/** Lowest setpoint the legacy client offers ("vacation" low). */
export const WATER_HEATER_MIN_F = 60;
/** The setpoint above the 60° floor; values in between are skipped. */
export const WATER_HEATER_LOW_RANGE_F = 80;
/** Hard ceiling: 65°C, rounded up to whole Fahrenheit. */
export const WATER_HEATER_CEILING_F = Math.ceil((65 * 9) / 5 + 32);

/**
 * The highest setpoint (°F) the user may pick: the device's
 * `waterheater:maxsetpoint` capped at 65°C.
 */
export function getWaterHeaterMaxF(device: DeviceEntity | undefined): number {
  const max = device?.[WaterHeater.ATTR_MAXSETPOINT] as number | undefined;
  if (typeof max !== 'number' || !Number.isFinite(max)) return WATER_HEATER_CEILING_F;
  return Math.max(WATER_HEATER_MIN_F, Math.min(Math.floor((max * 9) / 5 + 32), WATER_HEATER_CEILING_F));
}

/**
 * The next setpoint (°F) one step up or down from `current`. Matches the
 * legacy spinner: 60° jumps straight to 80° and back, otherwise 1° steps,
 * clamped to [60, max].
 */
export function stepWaterHeaterSetpoint(current: number, direction: 1 | -1, maxF: number): number {
  let next: number;
  if (direction === 1) {
    next = current < WATER_HEATER_LOW_RANGE_F ? WATER_HEATER_LOW_RANGE_F : current + 1;
  } else {
    next = current <= WATER_HEATER_LOW_RANGE_F ? WATER_HEATER_MIN_F : current - 1;
  }
  return Math.max(WATER_HEATER_MIN_F, Math.min(next, maxF));
}

/** Badge text for AO Smith's special control modes; null for Standard. */
export function getWaterHeaterModeLabel(mode: string | undefined): string | null {
  switch (mode) {
    case AOSmithWaterHeaterController.CONTROLMODE_ENERGY_SMART:
      return 'EnergySmart®';
    case AOSmithWaterHeaterController.CONTROLMODE_VACATION:
      return 'Vacation';
    default:
      return null;
  }
}

/** Display label for `waterheater:hotwaterlevel`. */
export function getHotWaterLevelLabel(level: string | undefined): string {
  switch (level) {
    case WaterHeater.HOTWATERLEVEL_HIGH:
      return 'High';
    case WaterHeater.HOTWATERLEVEL_MEDIUM:
      return 'Medium';
    case WaterHeater.HOTWATERLEVEL_LOW:
      return 'Low';
    default:
      return '--';
  }
}

// ── Water softener ────────────────────────────────────────────────────

/**
 * Salt level as a percentage of the tank's capacity, or null when the
 * device doesn't report both levels.
 */
export function getSaltLevelPercent(device: DeviceEntity | undefined): number | null {
  const current = device?.[WaterSoftener.ATTR_CURRENTSALTLEVEL] as number | undefined;
  const max = device?.[WaterSoftener.ATTR_MAXSALTLEVEL] as number | undefined;
  if (typeof current !== 'number' || typeof max !== 'number' || max <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((current / max) * 100)));
}

/** Minutes remaining formatted as `h:mm`. */
export function formatRechargeTimeRemaining(minutes: number | undefined): string {
  if (typeof minutes !== 'number' || minutes < 0) return '0:00';
  const hours = Math.floor(minutes / 60);
  const mins = String(Math.floor(minutes % 60)).padStart(2, '0');
  return `${hours}:${mins}`;
}

/** Hour of day (0–23) formatted as `h:00 AM|PM`. */
export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}

/** Device-row status text for a water softener, from its recharge status. */
export function getWaterSoftenerStatus(device: DeviceEntity): string {
  switch (device[WaterSoftener.ATTR_RECHARGESTATUS]) {
    case WaterSoftener.RECHARGESTATUS_RECHARGE_SCHEDULED: {
      const hour = device[WaterSoftener.ATTR_RECHARGESTARTTIME] as number | undefined;
      return typeof hour === 'number' ? `Recharge Time: ${formatHour(hour)}` : 'Recharge Scheduled';
    }
    case WaterSoftener.RECHARGESTATUS_RECHARGING: {
      const remaining = device[WaterSoftener.ATTR_RECHARGETIMEREMAINING] as number | undefined;
      return `Recharging: ${formatRechargeTimeRemaining(remaining)} Left`;
    }
    default:
      return 'Ready';
  }
}

/** Device-row status text for a water heater. */
export function getWaterHeaterStatus(device: DeviceEntity): string {
  const sp = device[WaterHeater.ATTR_SETPOINT] as number | undefined;
  const heating = device[WaterHeater.ATTR_HEATINGSTATE] === true;
  if (typeof sp !== 'number') return heating ? 'Heating' : 'Idle';
  return `${heating ? 'Heating to' : 'Set to'} ${celsiusToFahrenheit(sp)}°`;
}

// ── EcoWater flow alerts ──────────────────────────────────────────────

export type FlowRateKey = 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface FlowRateOption {
  key: FlowRateKey;
  /** Gallons per minute written to `ecowater:continuousRate`. */
  gpm: number;
  label: string;
}

export const FLOW_RATE_OPTIONS: FlowRateOption[] = [
  { key: 'OFF', gpm: 0, label: 'OFF - Disable push notification and email' },
  { key: 'LOW', gpm: 0.3, label: 'LOW (0.3 GPM or more) - Faucet trickling' },
  { key: 'MEDIUM', gpm: 2, label: 'MEDIUM (2.0 GPM or more) - Faucet left running' },
  { key: 'HIGH', gpm: 8, label: 'HIGH (8.0 GPM or more) - Several faucets running or a burst pipe' },
];

/** Map the continuous-use threshold back to the option it was set from. */
export function getFlowRateKey(device: DeviceEntity | undefined): FlowRateKey {
  if (device?.[EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE] === false) return 'OFF';
  const rate = device?.[EcowaterWaterSoftener.ATTR_CONTINUOUSRATE] as number | undefined;
  if (typeof rate !== 'number' || !Number.isFinite(rate)) return 'OFF';
  if (rate >= 8) return 'HIGH';
  if (rate >= 2) return 'MEDIUM';
  if (rate >= 0.3) return 'LOW';
  return 'OFF';
}
