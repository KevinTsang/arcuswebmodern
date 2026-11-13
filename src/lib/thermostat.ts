/**
 * Thermostat setpoint rules — ported from the legacy thermostat-slider and
 * thermostat components.
 *
 * The platform stores temperatures in Celsius; the UI works in whole degrees
 * Fahrenheit. These helpers derive the allowed setpoint range for a device
 * (platform limits, falling back to 45–95 °F, narrowed by a Nest temperature
 * lock) and apply the minimum heat/cool separation required in AUTO mode.
 */

import {
  Base, Device, DeviceAdvanced, HoneywellTCC, NestThermostat, Thermostat,
} from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

export const THERMOSTAT_MIN_F = 45;
export const THERMOSTAT_MAX_F = 95;
export const THERMOSTAT_MIN_SEPARATION_F = 3;
export const THERMOSTAT_DEFAULT_HEAT_F = 68;
export const THERMOSTAT_DEFAULT_COOL_F = 78;

/** Nest reports this devadv error while its cloud API is throttling writes. */
export const NEST_RATE_LIMIT_ERROR = 'ERR_RATELIMIT';

export interface ThermostatLimits {
  /** Lowest setpoint allowed, in °F. */
  minF: number;
  /** Highest setpoint allowed, in °F. */
  maxF: number;
  /** Minimum gap between heat and cool setpoints in AUTO, in °F. */
  separationF: number;
}

export interface SetpointsF {
  heatF: number;
  coolF: number;
}

export type SetpointKind = 'heat' | 'cool';

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

function normalizedTypeHint(device: DeviceEntity): string {
  return ((device[Device.ATTR_DEVTYPEHINT] as string | undefined) ?? '').replace(/\W/g, '').toLowerCase();
}

function hasCap(device: DeviceEntity, ns: string): boolean {
  return ((device[Base.ATTR_CAPS] as string[] | undefined) ?? []).includes(ns);
}

export function isNestThermostat(device: DeviceEntity): boolean {
  return normalizedTypeHint(device) === 'nestthermostat' || hasCap(device, NestThermostat.NAMESPACE);
}

export function isHoneywellTcc(device: DeviceEntity): boolean {
  return hasCap(device, HoneywellTCC.NAMESPACE) || normalizedTypeHint(device) === 'tccthermostat';
}

/** Whether the Nest temperature lock is on, with both lock bounds known. */
export function isNestLocked(device: DeviceEntity): boolean {
  return device[NestThermostat.ATTR_LOCKED] === true
    && typeof device[NestThermostat.ATTR_LOCKEDTEMPMIN] === 'number'
    && typeof device[NestThermostat.ATTR_LOCKEDTEMPMAX] === 'number';
}

/**
 * Whether the thermostat is temporarily blocked from user changes.
 * Nest rate-limits writes and reports ERR_RATELIMIT until it recovers.
 */
export function isThermostatBlocked(device: DeviceEntity): boolean {
  const errors = device[DeviceAdvanced.ATTR_ERRORS] as Record<string, string> | undefined;
  return isNestThermostat(device) && !!errors && NEST_RATE_LIMIT_ERROR in errors;
}

/**
 * AUTO is allowed when the driver says so. Old drivers that report neither
 * therm:supportsAuto nor therm:supportedmodes still allow it.
 */
export function isAutoSupported(device: DeviceEntity): boolean {
  const supportsAuto = device[Thermostat.ATTR_SUPPORTSAUTO];
  const supportedModes = device[Thermostat.ATTR_SUPPORTEDMODES] as string[] | undefined;
  if (typeof supportsAuto !== 'boolean' && !supportedModes) return true;
  return supportsAuto === true || (supportedModes ?? []).includes(Thermostat.HVACMODE_AUTO);
}

export function isEcoSupported(device: DeviceEntity): boolean {
  const supportedModes = device[Thermostat.ATTR_SUPPORTEDMODES] as string[] | undefined;
  return (supportedModes ?? []).includes(Thermostat.HVACMODE_ECO);
}

export function getThermostatLimits(device: DeviceEntity): ThermostatLimits {
  const minC = device[Thermostat.ATTR_MINSETPOINT] as number | undefined;
  const maxC = device[Thermostat.ATTR_MAXSETPOINT] as number | undefined;
  const separationC = device[Thermostat.ATTR_SETPOINTSEPARATION] as number | undefined;

  let minF = typeof minC === 'number' ? celsiusToFahrenheit(minC) : THERMOSTAT_MIN_F;
  let maxF = typeof maxC === 'number' ? celsiusToFahrenheit(maxC) : THERMOSTAT_MAX_F;
  // Separation is a temperature difference, so convert without the 32° offset.
  const separationF = typeof separationC === 'number' && separationC > 0
    ? Math.round((separationC * 9) / 5)
    : THERMOSTAT_MIN_SEPARATION_F;

  if (isNestLocked(device)) {
    minF = Math.max(minF, celsiusToFahrenheit(device[NestThermostat.ATTR_LOCKEDTEMPMIN] as number));
    maxF = Math.min(maxF, celsiusToFahrenheit(device[NestThermostat.ATTR_LOCKEDTEMPMAX] as number));
  }

  return { minF, maxF, separationF };
}

/**
 * Apply a one-step change to a setpoint and return the new pair, or null when
 * the change is not allowed (already at a limit, or AUTO separation would
 * push the other setpoint out of range).
 *
 * In AUTO, moving one setpoint into the separation gap pushes the other one
 * along with it, as the legacy slider did.
 */
export function applySetpointChange(
  mode: string,
  current: SetpointsF,
  kind: SetpointKind,
  delta: number,
  limits: ThermostatLimits,
): SetpointsF | null {
  const { minF, maxF, separationF } = limits;
  const value = kind === 'heat' ? current.heatF : current.coolF;
  if (delta > 0 && value >= maxF) return null;
  if (delta < 0 && value <= minF) return null;

  const target = Math.min(maxF, Math.max(minF, value + delta));
  let { heatF, coolF } = current;
  if (kind === 'heat') heatF = target;
  else coolF = target;

  if (mode === Thermostat.HVACMODE_AUTO && coolF - heatF < separationF) {
    if (kind === 'heat') {
      coolF = heatF + separationF;
      if (coolF > maxF) return null;
    } else {
      heatF = coolF - separationF;
      if (heatF < minF) return null;
    }
  }

  return { heatF, coolF };
}

/**
 * Setpoints to send when switching into AUTO. When either setpoint is missing
 * or they are closer than the separation allows, fall back to 68/78 °F.
 */
export function setpointsForAuto(
  heatF: number | undefined,
  coolF: number | undefined,
  limits: ThermostatLimits,
): SetpointsF | null {
  if (heatF != null && coolF != null && coolF - heatF >= limits.separationF) return null;
  return { heatF: THERMOSTAT_DEFAULT_HEAT_F, coolF: THERMOSTAT_DEFAULT_COOL_F };
}
