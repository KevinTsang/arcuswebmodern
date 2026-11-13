import { useMemo } from 'react';
import { Base, Device } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';

export interface CareTemplateDevice {
  address: string;
  name: string;
}

/**
 * The devices a care behavior template can use, with their display names.
 * Addresses the device store doesn't know yet fall back to the address.
 */
export function useCareTemplateDevices(availableDevices: string[]): CareTemplateDevice[] {
  const devices = useAppSelector(selectAllDevices);
  return useMemo(() => {
    const names = new Map(devices.map((d) => [d[Base.ATTR_ADDRESS], d[Device.ATTR_NAME]]));
    return availableDevices.map((address) => ({ address, name: names.get(address) ?? address }));
  }, [devices, availableDevices]);
}
