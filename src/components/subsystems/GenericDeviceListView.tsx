'use client';

/**
 * GenericDeviceListView — for subsystems without custom views.
 *
 * Used by Lights & Switches, Water, and any other subsystem that
 * simply lists its associated devices.
 */

import { Base } from '@arcus/core';
import { useSubsystemDevices } from '@/hooks/useSubsystem';
import { DevicePanel } from '@/components/devices';
import type { SubsystemConfigEntry } from '@/lib/subsystemConfig';

interface GenericDeviceListViewProps {
  config: SubsystemConfigEntry;
}

export function GenericDeviceListView({ config }: GenericDeviceListViewProps) {
  const devices = useSubsystemDevices(config.namespace, config.deviceAttributes);

  if (devices.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grouse mb-2">No {config.name.toLowerCase()} devices paired.</p>
        <p className="text-sm text-grouse">
          Visit the Product Catalog to browse available devices.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-grouse mb-4">
        {devices.length} device{devices.length !== 1 ? 's' : ''}
      </p>
      {devices.map((device) => (
        <DevicePanel key={device.id} address={device[Base.ATTR_ADDRESS]} />
      ))}
    </div>
  );
}
