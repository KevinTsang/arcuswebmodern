/**
 * Hooks for device configuration, icon resolution, badge computation,
 * and device state helpers.
 *
 * Replaces computed properties from the CanJS Device model (isOn, isOpen,
 * isOffline, icon, badges, configurators).
 */

import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectDeviceByAddress } from '../store/slices/devicesSlice';
import {
  resolveDeviceConfig,
  resolveDeviceBadges,
  resolveDeviceConfigurators,
  type DeviceWebConfig,
} from '../lib/deviceConfig';

type DeviceObj = Record<string, unknown>;

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
  // Switch capability
  if (device['swit:state'] !== undefined) {
    return device['swit:state'] === 'ON';
  }
  // Contact sensor
  if (device['cont:contact'] !== undefined) {
    return device['cont:contact'] === 'OPENED';
  }
  // Presence sensor
  if (device['pres:presence'] !== undefined) {
    return device['pres:presence'] === 'PRESENT';
  }
  return !isDeviceOffline(device);
}

export function isDeviceOpen(device: DeviceObj): boolean {
  // Contact sensor
  if (device['cont:contact'] !== undefined) {
    return device['cont:contact'] === 'OPENED';
  }
  // Tilt sensor
  if (device['tilt:tiltstate'] !== undefined) {
    return device['tilt:tiltstate'] === 'FLAT';
  }
  // Door lock
  if (device['doorlock:lockstate'] !== undefined) {
    return device['doorlock:lockstate'] === 'UNLOCKED';
  }
  // Motorized door
  if (device['motdoor:doorstate'] !== undefined) {
    return device['motdoor:doorstate'] !== 'CLOSED';
  }
  // Valve
  if (device['valv:valvestate'] !== undefined) {
    return device['valv:valvestate'] === 'OPEN';
  }
  return false;
}

export function isDeviceOffline(device: DeviceObj): boolean {
  const connState = device['devconn:state'] as string | undefined;
  return connState === 'OFFLINE';
}

export function isDeviceAway(device: DeviceObj): boolean {
  return device['pres:presence'] === 'ABSENT';
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
  const textContent = showText ? formatTemp(device['temp:temperature']) : '';

  // State classes
  const states: string[] = [];
  if (offline) states.push('is-offline');
  if (on && !offline) states.push('is-on');
  if (away) states.push('is-away');

  // Radial indicator for dimmers/fans/vents
  const brightness = (device['dim:brightness'] as number) ?? 0;
  const fanSpeed = (device['fan:speed'] as number) ?? 0;
  const ventLevel = (device['vent:level'] as number) ?? 0;
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
      const temp = device['temp:temperature'] as number | undefined;
      if (temp == null) return null;
      return { key, label: 'Temp', value: `${formatTemp(temp)}\u00B0`, icon: 'thermometer' };
    }
    case 'thermostat': {
      const mode = (device['therm:hvacmode'] as string) ?? 'OFF';
      const active = device['therm:active'] as string;
      const label = mode === 'OFF' ? 'Off' :
        mode === 'HEAT' ? 'Heat' :
        mode === 'COOL' ? 'Cool' :
        mode === 'AUTO' ? 'Auto' :
        mode === 'ECO' ? 'Eco' : mode;
      return { key, label: 'Mode', value: `${label}${active === 'RUNNING' ? ' (Active)' : ''}` };
    }
    case 'humidity': {
      const h = device['humid:humidity'] as number | undefined;
      if (h == null) return null;
      return { key, label: 'Humidity', value: `${Math.round(h)}%` };
    }
    case 'brightness': {
      const b = device['dim:brightness'] as number | undefined;
      if (b == null) return null;
      return { key, label: 'Brightness', value: `${b}%` };
    }
    case 'fan-speed': {
      const speed = device['fan:speed'] as number | undefined;
      if (speed == null) return null;
      const desc = speed === 0 ? 'Off' : speed <= 33 ? 'Low' : speed <= 66 ? 'Med' : 'High';
      return { key, label: 'Fan', value: desc };
    }
    case 'opened': {
      const open = isDeviceOpen(device);
      return { key, label: 'Status', value: open ? 'Open' : 'Closed' };
    }
    case 'presence': {
      const present = device['pres:presence'] === 'PRESENT';
      return { key, label: 'Status', value: present ? 'Home' : 'Away' };
    }
    case 'lockState': {
      const state = (device['petdoor:lockstate'] as string) ?? '';
      return { key, label: 'Lock', value: state === 'LOCKED' ? 'Locked' : state === 'UNLOCKED' ? 'Unlocked' : 'Auto' };
    }
    case 'powerSource': {
      const src = (device['devpow:source'] as string) ?? '';
      const battery = device['devpow:battery'] as number | undefined;
      if (src === 'BATTERY' && battery != null) {
        return { key, label: 'Battery', value: `${Math.round(battery)}%` };
      }
      return { key, label: 'Power', value: src === 'LINE' ? 'Plugged In' : src };
    }
    case 'heatingState': {
      const heating = device['waterheater:heatingstate'] as boolean;
      return { key, label: 'Heating', value: heating ? 'On' : 'Off' };
    }
    case 'hotWaterLevel': {
      const level = (device['waterheater:hotwaterlevel'] as string) ?? '';
      return { key, label: 'Hot Water', value: level === 'HIGH' ? 'High' : level === 'MEDIUM' ? 'Medium' : 'Low' };
    }
    case 'lowHeatTarget': {
      const sp = device['waterheater:setpoint'] as number | undefined;
      return sp != null ? { key, label: 'Target', value: `${formatTemp(sp)}\u00B0` } : null;
    }
    case 'leaf': {
      return device['nesttherm:hasleaf'] ? { key, label: 'Leaf', value: 'Active' } : null;
    }
    case 'colortemp': {
      const ct = device['colortemp:colortemp'] as number | undefined;
      return ct != null ? { key, label: 'Color Temp', value: `${ct}K` } : null;
    }
    case 'illuminance': {
      const lux = device['ill:illuminance'] as number | undefined;
      return lux != null ? { key, label: 'Lux', value: `${Math.round(lux)}` } : null;
    }
    case 'power': {
      const w = device['pow:instantaneous'] as number | undefined;
      return w != null ? { key, label: 'Power', value: `${Math.round(w)}W` } : null;
    }
    case 'pressure': {
      const p = device['atmos:pressure'] as number | undefined;
      return p != null ? { key, label: 'Pressure', value: `${Math.round(p)} mbar` } : null;
    }
    case 'spaceheater': {
      const heating = device['spaceheater:heatstate'] as string;
      return { key, label: 'Heater', value: heating === 'ON' ? 'Heating' : 'Idle' };
    }
    case 'scheduleType': {
      const state = (device['irrcont:controllerState'] as string) ?? '';
      return { key, label: 'Irrigation', value: state === 'WATERING' ? 'Watering' : 'Idle' };
    }
    case 'camera-preview':
      return { key, label: 'Camera', value: 'Active' };
    case 'salt-level': {
      const salt = device['watersoftener:currentSaltLevel'] as string | undefined;
      return salt != null ? { key, label: 'Salt', value: salt } : null;
    }
    case 'gpm': {
      const flow = device['flow:flow'] as number | undefined;
      return flow != null ? { key, label: 'Flow', value: `${flow.toFixed(1)} GPM` } : null;
    }
    case 'temperatureLocked':
      return device['nesttherm:locked'] ? { key, label: 'Locked', value: 'Yes' } : null;
    case 'ultraviolet-index': {
      const uv = device['uvi:index'] as number | undefined;
      return uv != null ? { key, label: 'UV', value: `${uv}` } : null;
    }
    case 'waterHeaterEnergySmart': {
      const mode = device['aosmithwaterheatercontroller:controlmode'] as string | undefined;
      return mode ? { key, label: 'Mode', value: mode } : null;
    }
    case 'somfy-type': {
      const t = device['somfyv1:type'] as string | undefined;
      return t ? { key, label: 'Type', value: t } : null;
    }
    case 'somfy-reversed':
      return { key, label: 'Reversed', value: 'Yes' };
    case 'somfy-channel': {
      const ch = device['somfyv1:channel'] as number | undefined;
      return ch != null ? { key, label: 'Channel', value: `${ch}` } : null;
    }
    default:
      return null;
  }
}

// ── Device Status Text ────────────────────────────────────────────────

export function getDeviceStatusText(device: DeviceObj, config: DeviceWebConfig): string {
  const on = isDeviceOn(device, config);
  const hint = ((device['dev:devtypehint'] as string) ?? '').replace(/\W/g, '').toLowerCase();

  switch (hint) {
    case 'switch':
      return on ? 'On' : 'Off';
    case 'dimmer':
    case 'light': {
      if (!on) return 'Off';
      const brightness = device['dim:brightness'] as number | undefined;
      return brightness != null ? `${brightness}% Brightness` : 'On';
    }
    case 'fancontrol': {
      if (!on) return 'Off';
      const speed = device['fan:speed'] as number;
      return speed === 0 ? 'Off' : `On`;
    }
    case 'contact':
    case 'tilt':
      return isDeviceOpen(device) ? 'Open' : 'Closed';
    case 'lock':
      return (device['doorlock:lockstate'] as string) === 'LOCKED' ? 'Locked' : 'Unlocked';
    case 'garagedoor':
      return (device['motdoor:doorstate'] as string) === 'CLOSED' ? 'Closed' : 'Open';
    case 'thermostat':
    case 'nestthermostat':
    case 'tccthermostat': {
      const mode = (device['therm:hvacmode'] as string) ?? 'OFF';
      if (mode === 'OFF') return 'Off';
      const heat = device['therm:heatsetpoint'] as number | undefined;
      const cool = device['therm:coolsetpoint'] as number | undefined;
      if (mode === 'HEAT' && heat != null) return `Heat to ${formatTemp(heat)}\u00B0`;
      if (mode === 'COOL' && cool != null) return `Cool to ${formatTemp(cool)}\u00B0`;
      if (mode === 'AUTO' && heat != null && cool != null) return `${formatTemp(heat)}\u00B0 - ${formatTemp(cool)}\u00B0`;
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
