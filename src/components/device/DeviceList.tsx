'use client';

/**
 * DeviceList — container rendering a list of DevicePanels.
 *
 * Replaces src/components/device/list/. Renders all devices
 * as individual panels with optional filtering.
 */

import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { DevicePanel } from './DevicePanel';

export function DeviceList() {
  const devices = useAppSelector(selectAllDevices);

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-grouse mb-2">No devices paired yet.</p>
        <p className="text-sm text-grouse">
          Use the Product Catalog to find and pair new devices.
        </p>
      </div>
    );
  }

  return (
    <div>
      {devices.map((device) => (
        <DevicePanel key={device.id} address={device['base:address']} />
      ))}
    </div>
  );
}
