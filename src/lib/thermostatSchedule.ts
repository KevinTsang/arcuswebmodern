/**
 * Thermostat schedule helpers.
 *
 * Thermostat schedules live on the platform scheduler targeting the
 * thermostat, with one schedule group per HVAC mode (HEAT, COOL, AUTO).
 * The platform follows the group matching the thermostat's current mode;
 * each command sets the heat/cool setpoints via `base:SetAttributes`.
 * Temperatures are stored in Celsius and displayed in Fahrenheit.
 */

import { Thermostat } from '@arcus/core';
import type { ScheduleAttributes, ScheduledCommand } from '@/components/schedules/types';

/** HVAC modes that carry their own schedule group, in display order. */
export const THERMOSTAT_SCHEDULE_MODES: readonly string[] = [
  Thermostat.HVACMODE_HEAT,
  Thermostat.HVACMODE_COOL,
  Thermostat.HVACMODE_AUTO,
];

export const THERMOSTAT_SCHEDULE_MODE_LABELS: Readonly<{ [mode: string]: string }> = {
  [Thermostat.HVACMODE_HEAT]: 'Heat',
  [Thermostat.HVACMODE_COOL]: 'Cool',
  [Thermostat.HVACMODE_AUTO]: 'Auto',
};

export const DEFAULT_MIN_SETPOINT_F = 45;
export const DEFAULT_MAX_SETPOINT_F = 95;
export const DEFAULT_SETPOINT_SEPARATION_F = 3;
export const DEFAULT_HEAT_SETPOINT_F = 68;
export const DEFAULT_COOL_SETPOINT_F = 78;

/** Thermostat attributes the schedule editor reads (Celsius values). */
export interface ThermostatScheduleDevice {
  [Thermostat.ATTR_HVACMODE]?: string;
  [Thermostat.ATTR_SUPPORTEDMODES]?: string[];
  [Thermostat.ATTR_SUPPORTSAUTO]?: boolean;
  [Thermostat.ATTR_HEATSETPOINT]?: number;
  [Thermostat.ATTR_COOLSETPOINT]?: number;
  [Thermostat.ATTR_MINSETPOINT]?: number;
  [Thermostat.ATTR_MAXSETPOINT]?: number;
  [Thermostat.ATTR_SETPOINTSEPARATION]?: number;
}

/** Setpoint bounds for schedule events, in Fahrenheit. */
export interface SetpointLimits {
  minF: number;
  maxF: number;
  separationF: number;
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/** The schedule modes this thermostat supports. */
export function thermostatScheduleModes(device: ThermostatScheduleDevice | undefined): string[] {
  const supported = device?.[Thermostat.ATTR_SUPPORTEDMODES];
  return THERMOSTAT_SCHEDULE_MODES.filter((mode) => {
    if (mode === Thermostat.HVACMODE_AUTO && device?.[Thermostat.ATTR_SUPPORTSAUTO] === false) return false;
    return !supported || supported.length === 0 || supported.includes(mode);
  });
}

/** The schedule group to show first: the thermostat's current mode, if it has one. */
export function initialScheduleMode(device: ThermostatScheduleDevice | undefined, modes: string[]): string {
  const current = device?.[Thermostat.ATTR_HVACMODE];
  if (current && modes.includes(current)) return current;
  return modes[0] ?? Thermostat.HVACMODE_HEAT;
}

/** Setpoint bounds from the device, falling back to the 45–95 °F / 3 °F defaults. */
export function setpointLimits(device: ThermostatScheduleDevice | undefined): SetpointLimits {
  const min = device?.[Thermostat.ATTR_MINSETPOINT];
  const max = device?.[Thermostat.ATTR_MAXSETPOINT];
  const separation = device?.[Thermostat.ATTR_SETPOINTSEPARATION];
  return {
    minF: min != null ? celsiusToFahrenheit(min) : DEFAULT_MIN_SETPOINT_F,
    maxF: max != null ? celsiusToFahrenheit(max) : DEFAULT_MAX_SETPOINT_F,
    // Separation is a temperature delta, so it scales without the 32° offset.
    separationF: separation ? Math.round((separation * 9) / 5) : DEFAULT_SETPOINT_SEPARATION_F,
  };
}

/** Attributes a new schedule event starts from: the thermostat's current setpoints. */
export function defaultScheduleAttributes(device: ThermostatScheduleDevice | undefined): ScheduleAttributes {
  return {
    [Thermostat.ATTR_HEATSETPOINT]:
      device?.[Thermostat.ATTR_HEATSETPOINT] ?? fahrenheitToCelsius(DEFAULT_HEAT_SETPOINT_F),
    [Thermostat.ATTR_COOLSETPOINT]:
      device?.[Thermostat.ATTR_COOLSETPOINT] ?? fahrenheitToCelsius(DEFAULT_COOL_SETPOINT_F),
  };
}

/** Read a setpoint attribute (Celsius) as whole Fahrenheit degrees. */
export function setpointF(attributes: ScheduleAttributes, attribute: string, fallbackF: number): number {
  const value = attributes[attribute];
  return typeof value === 'number' ? celsiusToFahrenheit(value) : fallbackF;
}

/** Short description of what a thermostat schedule event sets, e.g. "Heat 68°". */
export function describeThermostatCommand(command: ScheduledCommand): string {
  const attributes = command.attributes ?? {};
  const heat = setpointF(attributes, Thermostat.ATTR_HEATSETPOINT, DEFAULT_HEAT_SETPOINT_F);
  const cool = setpointF(attributes, Thermostat.ATTR_COOLSETPOINT, DEFAULT_COOL_SETPOINT_F);
  switch (command.scheduleId) {
    case Thermostat.HVACMODE_HEAT:
      return `Heat ${heat}°`;
    case Thermostat.HVACMODE_COOL:
      return `Cool ${cool}°`;
    case Thermostat.HVACMODE_AUTO:
      return `${heat}°–${cool}°`;
    default:
      return '';
  }
}
