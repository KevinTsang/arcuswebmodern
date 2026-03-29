/**
 * Hooks for device configuration, icon resolution, badge computation,
 * and device state helpers.
 *
 * Replaces computed properties from the CanJS Device model (isOn, isOpen,
 * isOffline, icon, badges, configurators).
 */

import { useMemo } from 'react';
import {
  Base, Switch, Contact, Presence, DoorLock, MotorizedDoor, Valve, Dimmer, Fan,
  Thermostat, DeviceConnection, DevicePower, Device, Temperature, Tilt, Vent,
  RelativeHumidity, PetDoor, WaterHeater, ColorTemperature, Illuminance,
  PowerUse, Atmos, SpaceHeater, IrrigationController, WaterSoftener, Flow,
  UltravioletIndex, AOSmithWaterHeaterController, Somfyv1,
} from '@arcus/core';
import { useAppSelector } from '../store/hooks';
import { selectDeviceByAddress } from '../store/slices/devicesSlice';
import {
  resolveDeviceConfig,
  resolveDeviceBadges,
  resolveDeviceConfigurators,
  type DeviceWebConfig,
} from '../lib/deviceConfig';
import type { DeviceEntity } from '../store/entityTypes';

type DeviceObj = DeviceEntity;

// ── Multi-Switch Instance Helpers ─────────────────────────────────────

/**
 * Get switch instance keys from a multi-switch device (e.g., ZEN17 dual relay).
 * Reads `base:instances` and returns keys whose capabilities include `swit`.
 * Returns empty array for single-switch or non-switch devices.
 */
export function getSwitchInstances(device: DeviceObj): string[] {
  const instances = device[Base.ATTR_INSTANCES] as Record<string, string[]> | undefined;
  if (!instances) return [];
  return Object.entries(instances)
    .filter(([, caps]) => Array.isArray(caps) && caps.includes('swit'))
    .map(([key]) => key);
}

/**
 * Format an instance key to a human-readable label.
 * e.g., "relay1" → "Relay 1", "outlet2" → "Outlet 2"
 */
export function formatInstanceName(key: string): string {
  return key
    .replace(/([a-z])(\d)/i, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// ── Device State Helpers ──────────────────────────────────────────────

/** Celsius to Fahrenheit */
export function cToF(c: number): number {
  return Math.round(c * 9 / 5 + 32);
}

/** Format temperature (platform stores C, display F) */
export function formatTemp(temp: unknown): string {
  if (temp == null) return '--';
  const f = cToF(Number(temp));
  return `${f}`;
}

export function isDeviceOn(device: DeviceObj, config: DeviceWebConfig): boolean {
  if (config['web:isOnUnlessOffline']) {
    return !isDeviceOffline(device);
  }
  // Multi-switch: on if any instance is ON
  const switchInstances = getSwitchInstances(device);
  if (switchInstances.length > 1) {
    return switchInstances.some((key) => device[`${Switch.ATTR_STATE}:${key}`] === Switch.STATE_ON);
  }
  // Single switch capability
  if (device[Switch.ATTR_STATE] !== undefined) {
    return device[Switch.ATTR_STATE] === Switch.STATE_ON;
  }
  // Contact sensor
  if (device[Contact.ATTR_CONTACT] !== undefined) {
    return device[Contact.ATTR_CONTACT] === Contact.CONTACT_OPENED;
  }
  // Presence sensor
  if (device[Presence.ATTR_PRESENCE] !== undefined) {
    return device[Presence.ATTR_PRESENCE] === Presence.PRESENCE_PRESENT;
  }
  return !isDeviceOffline(device);
}

export function isDeviceOpen(device: DeviceObj): boolean {
  // Contact sensor
  if (device[Contact.ATTR_CONTACT] !== undefined) {
    return device[Contact.ATTR_CONTACT] === Contact.CONTACT_OPENED;
  }
  // Tilt sensor
  if (device[Tilt.ATTR_TILTSTATE] !== undefined) {
    return device[Tilt.ATTR_TILTSTATE] === Tilt.TILTSTATE_FLAT;
  }
  // Door lock
  if (device[DoorLock.ATTR_LOCKSTATE] !== undefined) {
    return device[DoorLock.ATTR_LOCKSTATE] === DoorLock.LOCKSTATE_UNLOCKED;
  }
  // Motorized door
  if (device[MotorizedDoor.ATTR_DOORSTATE] !== undefined) {
    return device[MotorizedDoor.ATTR_DOORSTATE] !== MotorizedDoor.DOORSTATE_CLOSED;
  }
  // Valve
  if (device[Valve.ATTR_VALVESTATE] !== undefined) {
    return device[Valve.ATTR_VALVESTATE] === Valve.VALVESTATE_OPEN;
  }
  return false;
}

export function isDeviceOffline(device: DeviceObj): boolean {
  const connState = device[DeviceConnection.ATTR_STATE] as string | undefined;
  return connState === DeviceConnection.STATE_OFFLINE;
}

export function isDeviceAway(device: DeviceObj): boolean {
  return device[Presence.ATTR_PRESENCE] === Presence.PRESENCE_ABSENT;
}

// ── Icon Resolution ───────────────────────────────────────────────────

export interface DeviceIconInfo {
  /** CSS class for the icon */
  iconClass: string;
  /** Whether to show text instead of icon (e.g., temperature) */
  showText: boolean;
  /** Text content (formatted temperature) */
  textContent: string;
  /** CSS state classes for styling */
  stateClass: string;
  /** Whether device has a radial indicator (dimmer/fan/vent) */
  hasRadial: boolean;
  /** Brightness 0-100 for opacity */
  brightness: number;
}

export function resolveDeviceIcon(device: DeviceObj, config: DeviceWebConfig): DeviceIconInfo {
  const on = isDeviceOn(device, config);
  const open = isDeviceOpen(device);
  const offline = isDeviceOffline(device);
  const away = isDeviceAway(device);

  // Determine icon class
  let iconClass: string;
  if (on && open && config['web:icon:onAndOpen']) {
    iconClass = config['web:icon:onAndOpen'];
  } else if (on && !open && config['web:icon:onAndClosed']) {
    iconClass = config['web:icon:onAndClosed'];
  } else if (!on && open && config['web:icon:offAndOpen']) {
    iconClass = config['web:icon:offAndOpen'];
  } else if (!on && !open && config['web:icon:offAndClosed']) {
    iconClass = config['web:icon:offAndClosed'];
  } else if (on) {
    iconClass = config['web:icon:on'];
  } else {
    iconClass = config['web:icon:off'];
  }

  // Text icon (thermostats show temperature)
  const showText = on && config['web:icon:onText'] === 'temperature';
  const textContent = showText ? formatTemp(device[Temperature.ATTR_TEMPERATURE]) : '';

  // State classes
  const states: string[] = [];
  if (offline) states.push('is-offline');
  if (on && !offline) states.push('is-on');
  if (away) states.push('is-away');

  // Radial indicator for dimmers/fans/vents
  const brightness = (device[Dimmer.ATTR_BRIGHTNESS] as number) ?? 0;
  const fanSpeed = (device[Fan.ATTR_SPEED] as number) ?? 0;
  const ventLevel = (device[Vent.ATTR_LEVEL] as number) ?? 0;
  const hasRadial = on && (brightness > 0 || fanSpeed > 0 || ventLevel > 0);

  return {
    iconClass,
    showText,
    textContent,
    stateClass: states.join(' '),
    hasRadial,
    brightness,
  };
}

// ── Badge Data ────────────────────────────────────────────────────────

export interface BadgeInfo {
  key: string;
  label: string;
  value: string;
  icon?: string;
}

export function resolveDeviceBadgeData(device: DeviceObj): BadgeInfo[] {
  const badgeKeys = resolveDeviceBadges(device);
  const result: BadgeInfo[] = [];

  for (const key of badgeKeys) {
    const info = getBadgeInfo(key, device);
    if (info) result.push(info);
  }
  return result;
}

function getBadgeInfo(key: string, device: DeviceObj): BadgeInfo | null {
  switch (key) {
    case 'temperature': {
      const temp = device[Temperature.ATTR_TEMPERATURE] as number | undefined;
      if (temp == null) return null;
      return { key, label: 'Temp', value: `${formatTemp(temp)}\u00B0`, icon: 'thermometer' };
    }
    case 'thermostat': {
      const mode = (device[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;
      const active = device[Thermostat.ATTR_ACTIVE] as string;
      const label = mode === Thermostat.HVACMODE_OFF ? 'Off' :
        mode === Thermostat.HVACMODE_HEAT ? 'Heat' :
        mode === Thermostat.HVACMODE_COOL ? 'Cool' :
        mode === Thermostat.HVACMODE_AUTO ? 'Auto' :
        mode === Thermostat.HVACMODE_ECO ? 'Eco' : mode;
      return { key, label: 'Mode', value: `${label}${active === Thermostat.ACTIVE_RUNNING ? ' (Active)' : ''}` };
    }
    case 'humidity': {
      const h = device[RelativeHumidity.ATTR_HUMIDITY] as number | undefined;
      if (h == null) return null;
      return { key, label: 'Humidity', value: `${Math.round(h)}%` };
    }
    case 'brightness': {
      const b = device[Dimmer.ATTR_BRIGHTNESS] as number | undefined;
      if (b == null) return null;
      return { key, label: 'Brightness', value: `${b}%` };
    }
    case 'fan-speed': {
      const speed = device[Fan.ATTR_SPEED] as number | undefined;
      if (speed == null) return null;
      const desc = speed === 0 ? 'Off' : speed <= 33 ? 'Low' : speed <= 66 ? 'Med' : 'High';
      return { key, label: 'Fan', value: desc };
    }
    case 'opened': {
      const open = isDeviceOpen(device);
      return { key, label: 'Status', value: open ? 'Open' : 'Closed' };
    }
    case 'presence': {
      const present = device[Presence.ATTR_PRESENCE] === Presence.PRESENCE_PRESENT;
      return { key, label: 'Status', value: present ? 'Home' : 'Away' };
    }
    case 'lockState': {
      const state = (device[PetDoor.ATTR_LOCKSTATE] as string) ?? '';
      return { key, label: 'Lock', value: state === PetDoor.LOCKSTATE_LOCKED ? 'Locked' : state === PetDoor.LOCKSTATE_UNLOCKED ? 'Unlocked' : 'Auto' };
    }
    case 'powerSource': {
      const src = (device[DevicePower.ATTR_SOURCE] as string) ?? '';
      const battery = device[DevicePower.ATTR_BATTERY] as number | undefined;
      if (src === DevicePower.SOURCE_BATTERY && battery != null) {
        return { key, label: 'Battery', value: `${Math.round(battery)}%` };
      }
      return { key, label: 'Power', value: src === DevicePower.SOURCE_LINE ? 'Plugged In' : src };
    }
    case 'heatingState': {
      const heating = device[WaterHeater.ATTR_HEATINGSTATE] as boolean;
      return { key, label: 'Heating', value: heating ? 'On' : 'Off' };
    }
    case 'hotWaterLevel': {
      const level = (device[WaterHeater.ATTR_HOTWATERLEVEL] as string) ?? '';
      return { key, label: 'Hot Water', value: level === WaterHeater.HOTWATERLEVEL_HIGH ? 'High' : level === WaterHeater.HOTWATERLEVEL_MEDIUM ? 'Medium' : 'Low' };
    }
    case 'lowHeatTarget': {
      const sp = device[WaterHeater.ATTR_SETPOINT] as number | undefined;
      return sp != null ? { key, label: 'Target', value: `${formatTemp(sp)}\u00B0` } : null;
    }
    case 'leaf': {
      return device['nesttherm:hasleaf'] ? { key, label: 'Leaf', value: 'Active' } : null;
    }
    case 'colortemp': {
      const ct = device[ColorTemperature.ATTR_COLORTEMP] as number | undefined;
      return ct != null ? { key, label: 'Color Temp', value: `${ct}K` } : null;
    }
    case 'illuminance': {
      const lux = device[Illuminance.ATTR_ILLUMINANCE] as number | undefined;
      return lux != null ? { key, label: 'Lux', value: `${Math.round(lux)}` } : null;
    }
    case 'power': {
      const w = device[PowerUse.ATTR_INSTANTANEOUS] as number | undefined;
      return w != null ? { key, label: 'Power', value: `${Math.round(w)}W` } : null;
    }
    case 'pressure': {
      const p = device[Atmos.ATTR_PRESSURE] as number | undefined;
      return p != null ? { key, label: 'Pressure', value: `${Math.round(p)} mbar` } : null;
    }
    case 'spaceheater': {
      const heating = device[SpaceHeater.ATTR_HEATSTATE] as string;
      return { key, label: 'Heater', value: heating === SpaceHeater.HEATSTATE_ON ? 'Heating' : 'Idle' };
    }
    case 'scheduleType': {
      const state = (device[IrrigationController.ATTR_CONTROLLERSTATE] as string) ?? '';
      return { key, label: 'Irrigation', value: state === IrrigationController.CONTROLLERSTATE_WATERING ? 'Watering' : 'Idle' };
    }
    case 'camera-preview':
      return { key, label: 'Camera', value: 'Active' };
    case 'salt-level': {
      const salt = device[WaterSoftener.ATTR_CURRENTSALTLEVEL] as string | undefined;
      return salt != null ? { key, label: 'Salt', value: salt } : null;
    }
    case 'gpm': {
      const flow = device[Flow.ATTR_FLOW] as number | undefined;
      return flow != null ? { key, label: 'Flow', value: `${flow.toFixed(1)} GPM` } : null;
    }
    case 'temperatureLocked':
      return device['nesttherm:locked'] ? { key, label: 'Locked', value: 'Yes' } : null;
    case 'ultraviolet-index': {
      const uv = device[UltravioletIndex.ATTR_INDEX] as number | undefined;
      return uv != null ? { key, label: 'UV', value: `${uv}` } : null;
    }
    case 'waterHeaterEnergySmart': {
      const mode = device[AOSmithWaterHeaterController.ATTR_CONTROLMODE] as string | undefined;
      return mode ? { key, label: 'Mode', value: mode } : null;
    }
    case 'somfy-type': {
      const t = device[Somfyv1.ATTR_TYPE] as string | undefined;
      return t ? { key, label: 'Type', value: t } : null;
    }
    case 'somfy-reversed':
      return { key, label: 'Reversed', value: 'Yes' };
    case 'somfy-channel': {
      const ch = device[Somfyv1.ATTR_CHANNEL] as number | undefined;
      return ch != null ? { key, label: 'Channel', value: `${ch}` } : null;
    }
    default:
      return null;
  }
}

// ── Device Status Text ────────────────────────────────────────────────

export function getDeviceStatusText(device: DeviceObj, config: DeviceWebConfig): string {
  const on = isDeviceOn(device, config);
  const hint = ((device[Device.ATTR_DEVTYPEHINT] as string) ?? '').replace(/\W/g, '').toLowerCase();

  // Multi-switch: show per-instance status
  const switchInstances = getSwitchInstances(device);
  if (switchInstances.length > 1) {
    return switchInstances
      .map((key) => {
        const state = device[`${Switch.ATTR_STATE}:${key}`] === Switch.STATE_ON ? 'On' : 'Off';
        return `${formatInstanceName(key)} ${state}`;
      })
      .join(', ');
  }

  switch (hint) {
    case 'switch':
      return on ? 'On' : 'Off';
    case 'dimmer':
    case 'light': {
      if (!on) return 'Off';
      const brightness = device[Dimmer.ATTR_BRIGHTNESS] as number | undefined;
      return brightness != null ? `${brightness}% Brightness` : 'On';
    }
    case 'fancontrol': {
      if (!on) return 'Off';
      const speed = device[Fan.ATTR_SPEED] as number;
      return speed === 0 ? 'Off' : `On`;
    }
    case 'contact':
    case 'tilt':
      return isDeviceOpen(device) ? 'Open' : 'Closed';
    case 'lock':
      return (device[DoorLock.ATTR_LOCKSTATE] as string) === DoorLock.LOCKSTATE_LOCKED ? 'Locked' : 'Unlocked';
    case 'garagedoor':
      return (device[MotorizedDoor.ATTR_DOORSTATE] as string) === MotorizedDoor.DOORSTATE_CLOSED ? 'Closed' : 'Open';
    case 'thermostat':
    case 'nestthermostat':
    case 'tccthermostat': {
      const mode = (device[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;
      if (mode === Thermostat.HVACMODE_OFF) return 'Off';
      const heat = device[Thermostat.ATTR_HEATSETPOINT] as number | undefined;
      const cool = device[Thermostat.ATTR_COOLSETPOINT] as number | undefined;
      if (mode === Thermostat.HVACMODE_HEAT && heat != null) return `Heat to ${formatTemp(heat)}\u00B0`;
      if (mode === Thermostat.HVACMODE_COOL && cool != null) return `Cool to ${formatTemp(cool)}\u00B0`;
      if (mode === Thermostat.HVACMODE_AUTO && heat != null && cool != null) return `${formatTemp(heat)}\u00B0 - ${formatTemp(cool)}\u00B0`;
      return mode;
    }
    case 'motion':
      return 'Ok';
    case 'watervalve':
      return isDeviceOpen(device) ? 'Open' : 'Closed';
    default:
      return on ? 'On' : 'Off';
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────

/**
 * Get the resolved web config for a device.
 */
export function useDeviceConfig(address: string): DeviceWebConfig | null {
  const device = useAppSelector((s) => selectDeviceByAddress(s, address));
  return useMemo(() => {
    if (!device) return null;
    return resolveDeviceConfig(device);
  }, [device]);
}

/**
 * Get the resolved icon info for a device.
 */
export function useDeviceIcon(address: string): DeviceIconInfo | null {
  const device = useAppSelector((s) => selectDeviceByAddress(s, address));
  return useMemo(() => {
    if (!device) return null;
    const config = resolveDeviceConfig(device);
    return resolveDeviceIcon(device, config);
  }, [device]);
}

/**
 * Get resolved badge data for a device.
 */
export function useDeviceBadges(address: string): BadgeInfo[] {
  const device = useAppSelector((s) => selectDeviceByAddress(s, address));
  return useMemo(() => {
    if (!device) return [];
    return resolveDeviceBadgeData(device);
  }, [device]);
}

/**
 * Get resolved configurator keys for a device.
 */
export function useDeviceConfigurators(address: string): string[] {
  const device = useAppSelector((s) => selectDeviceByAddress(s, address));
  return useMemo(() => {
    if (!device) return [];
    return resolveDeviceConfigurators(device);
  }, [device]);
}

/**
 * Get device status text.
 */
export function useDeviceStatus(address: string): string {
  const device = useAppSelector((s) => selectDeviceByAddress(s, address));
  return useMemo(() => {
    if (!device) return '';
    const config = resolveDeviceConfig(device);
    return getDeviceStatusText(device, config);
  }, [device]);
}
