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

/**
 * Core hook providing low-level device command helpers.
 */
export function useDeviceActions(address: string) {
  /**
   * Set one or more attributes on the device via base:SetAttributes.
   */
  const setAttribute = useCallback(
    (key: string, value: unknown) => {
      return Bridge.request('base:SetAttributes', address, { [key]: value });
    },
    [address],
  );

  /**
   * Set multiple attributes at once via base:SetAttributes.
   */
  const setAttributes = useCallback(
    (attrs: Record<string, unknown>) => {
      return Bridge.request('base:SetAttributes', address, attrs);
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
    () => setAttribute('swit:state', 'ON'),
    [setAttribute],
  );

  const turnOff = useCallback(
    () => setAttribute('swit:state', 'OFF'),
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
    (brightness: number) => setAttribute('dim:brightness', brightness),
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
    (temp: number) => setAttribute('therm:heatsetpoint', temp),
    [setAttribute],
  );

  const setCoolSetpoint = useCallback(
    (temp: number) => setAttribute('therm:coolsetpoint', temp),
    [setAttribute],
  );

  const setMode = useCallback(
    (mode: string) => setAttribute('therm:hvacmode', mode),
    [setAttribute],
  );

  const setFanMode = useCallback(
    (fanMode: number) => setAttribute('therm:fanmode', fanMode),
    [setAttribute],
  );

  const setIdealTemperature = useCallback(
    (temperature: number) =>
      sendCommand('therm:SetIdealTemperature', { temperature }),
    [sendCommand],
  );

  const incrementIdealTemperature = useCallback(
    (amount: number) =>
      sendCommand('therm:IncrementIdealTemperature', { amount }),
    [sendCommand],
  );

  const decrementIdealTemperature = useCallback(
    (amount: number) =>
      sendCommand('therm:DecrementIdealTemperature', { amount }),
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
    () => setAttribute('doorlock:lockstate', 'LOCKED'),
    [setAttribute],
  );

  const unlock = useCallback(
    () => setAttribute('doorlock:lockstate', 'UNLOCKED'),
    [setAttribute],
  );

  const buzzIn = useCallback(
    () => sendCommand('doorlock:BuzzIn', {}),
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
      setAttributes({ 'color:hue': hue, 'color:saturation': saturation }),
    [setAttributes],
  );

  const setColorTemperature = useCallback(
    (colortemp: number) => setAttribute('colortemp:colortemp', colortemp),
    [setAttribute],
  );

  return useMemo(
    () => ({ setColor, setColorTemperature }),
    [setColor, setColorTemperature],
  );
}
