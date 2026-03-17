/**
 * Hook for executing device capability commands.
 *
 * Replaces the OOP pattern where capability methods were mixed into device
 * model instances (e.g., `device.toggleSwitch()`). Instead, React components
 * use this hook to get action functions bound to a specific device address.
 *
 * Usage:
 *   const { setAttribute, sendCommand } = useDeviceActions(address);
 *   await setAttribute('swit:state', 'ON');
 *   await sendCommand('therm:SetIdealTemperature', { temperature: 72 });
 */

import { useCallback, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import {
  Base, Switch, Dimmer, Thermostat, DoorLock, Color, ColorTemperature,
} from '@arcus/core';

/**
 * Core hook providing low-level device command helpers.
 */
export function useDeviceActions(address: string) {
  /**
   * Set one or more attributes on the device via base:SetAttributes.
   */
  const setAttribute = useCallback(
    (key: string, value: unknown) => {
      return Bridge.request(Base.CMD_SETATTRIBUTES, address, { [key]: value });
    },
    [address],
  );

  /**
   * Set multiple attributes at once via base:SetAttributes.
   */
  const setAttributes = useCallback(
    (attrs: Record<string, unknown>) => {
      return Bridge.request(Base.CMD_SETATTRIBUTES, address, attrs);
    },
    [address],
  );

  /**
   * Send an arbitrary command to the device.
   */
  const sendCommand = useCallback(
    (commandType: string, attrs?: Record<string, unknown>) => {
      return Bridge.request(commandType, address, attrs ?? {});
    },
    [address],
  );

  return useMemo(
    () => ({ setAttribute, setAttributes, sendCommand }),
    [setAttribute, setAttributes, sendCommand],
  );
}

// ── Convenience hooks for common capabilities ─────────────────────────

/**
 * Switch capability actions (swit namespace).
 */
export function useSwitchActions(address: string) {
  const { setAttribute } = useDeviceActions(address);

  const turnOn = useCallback(
    () => setAttribute(Switch.ATTR_STATE, Switch.STATE_ON),
    [setAttribute],
  );

  const turnOff = useCallback(
    () => setAttribute(Switch.ATTR_STATE, Switch.STATE_OFF),
    [setAttribute],
  );

  return useMemo(() => ({ turnOn, turnOff }), [turnOn, turnOff]);
}

/**
 * Dimmer capability actions (dim namespace).
 */
export function useDimmerActions(address: string) {
  const { setAttribute } = useDeviceActions(address);

  const setBrightness = useCallback(
    (brightness: number) => setAttribute(Dimmer.ATTR_BRIGHTNESS, brightness),
    [setAttribute],
  );

  return useMemo(() => ({ setBrightness }), [setBrightness]);
}

/**
 * Thermostat capability actions (therm namespace).
 */
export function useThermostatActions(address: string) {
  const { setAttribute, sendCommand } = useDeviceActions(address);

  const setHeatSetpoint = useCallback(
    (temp: number) => setAttribute(Thermostat.ATTR_HEATSETPOINT, temp),
    [setAttribute],
  );

  const setCoolSetpoint = useCallback(
    (temp: number) => setAttribute(Thermostat.ATTR_COOLSETPOINT, temp),
    [setAttribute],
  );

  const setMode = useCallback(
    (mode: string) => setAttribute(Thermostat.ATTR_HVACMODE, mode),
    [setAttribute],
  );

  const setFanMode = useCallback(
    (fanMode: number) => setAttribute(Thermostat.ATTR_FANMODE, fanMode),
    [setAttribute],
  );

  const setIdealTemperature = useCallback(
    (temperature: number) =>
      sendCommand(Thermostat.CMD_SETIDEALTEMPERATURE, { temperature }),
    [sendCommand],
  );

  const incrementIdealTemperature = useCallback(
    (amount: number) =>
      sendCommand(Thermostat.CMD_INCREMENTIDEALTEMPERATURE, { amount }),
    [sendCommand],
  );

  const decrementIdealTemperature = useCallback(
    (amount: number) =>
      sendCommand(Thermostat.CMD_DECREMENTIDEALTEMPERATURE, { amount }),
    [sendCommand],
  );

  return useMemo(
    () => ({
      setHeatSetpoint,
      setCoolSetpoint,
      setMode,
      setFanMode,
      setIdealTemperature,
      incrementIdealTemperature,
      decrementIdealTemperature,
    }),
    [
      setHeatSetpoint,
      setCoolSetpoint,
      setMode,
      setFanMode,
      setIdealTemperature,
      incrementIdealTemperature,
      decrementIdealTemperature,
    ],
  );
}

/**
 * Door lock capability actions (doorlock namespace).
 */
export function useDoorLockActions(address: string) {
  const { setAttribute, sendCommand } = useDeviceActions(address);

  const lock = useCallback(
    () => setAttribute(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_LOCKED),
    [setAttribute],
  );

  const unlock = useCallback(
    () => setAttribute(DoorLock.ATTR_LOCKSTATE, DoorLock.LOCKSTATE_UNLOCKED),
    [setAttribute],
  );

  const buzzIn = useCallback(
    () => sendCommand(DoorLock.CMD_BUZZIN, {}),
    [sendCommand],
  );

  return useMemo(() => ({ lock, unlock, buzzIn }), [lock, unlock, buzzIn]);
}

/**
 * Color capability actions (color namespace).
 */
export function useColorActions(address: string) {
  const { setAttribute, setAttributes } = useDeviceActions(address);

  const setColor = useCallback(
    (hue: number, saturation: number) =>
      setAttributes({ [Color.ATTR_HUE]: hue, [Color.ATTR_SATURATION]: saturation }),
    [setAttributes],
  );

  const setColorTemperature = useCallback(
    (colortemp: number) => setAttribute(ColorTemperature.ATTR_COLORTEMP, colortemp),
    [setAttribute],
  );

  return useMemo(
    () => ({ setColor, setColorTemperature }),
    [setColor, setColorTemperature],
  );
}
