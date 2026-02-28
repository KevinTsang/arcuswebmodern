/**
 * Hook for reading device capability attributes from Redux state.
 *
 * Replaces the OOP mixin pattern where capability modules were mixed into
 * device model instances. Instead, React components use this hook to
 * access typed capability attributes from the Redux store.
 *
 * Usage:
 *   const brightness = useDeviceCapability(address, 'dim:brightness');
 *   const { 'swit:state': switchState, 'dim:brightness': brightness } =
 *     useDeviceCapabilities(address, ['swit:state', 'dim:brightness']);
 */

import { useAppSelector } from '../store/hooks';
import { selectDeviceByAddress } from '../store/slices/devicesSlice';

/**
 * Read a single capability attribute from a device.
 */
export function useDeviceCapability<T = unknown>(
  address: string,
  attribute: string,
): T | undefined {
  return useAppSelector((state) => {
    const device = selectDeviceByAddress(state, address);
    return device?.[attribute] as T | undefined;
  });
}

/**
 * Read multiple capability attributes from a device.
 * Returns an object with only the requested keys.
 */
export function useDeviceCapabilities<K extends string>(
  address: string,
  attributes: K[],
): Partial<Record<K, unknown>> {
  return useAppSelector((state) => {
    const device = selectDeviceByAddress(state, address);
    if (!device) return {};
    const result: Partial<Record<K, unknown>> = {};
    for (const attr of attributes) {
      result[attr] = device[attr];
    }
    return result;
  });
}

/**
 * Get the full device entity from Redux state.
 */
export function useDevice(address: string) {
  return useAppSelector((state) => selectDeviceByAddress(state, address));
}

/**
 * Check if a device supports a given capability namespace.
 * Reads the 'base:caps' array (list of capability namespaces the device supports).
 */
export function useDeviceHasCapability(
  address: string,
  capabilityNamespace: string,
): boolean {
  return useAppSelector((state) => {
    const device = selectDeviceByAddress(state, address);
    const caps = device?.['base:caps'] as string[] | undefined;
    return caps?.includes(capabilityNamespace) ?? false;
  });
}
