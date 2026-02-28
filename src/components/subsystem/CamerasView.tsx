'use client';

/**
 * CamerasView — cameras subsystem status.
 *
 * Replaces src/components/subsystem/cameras/. Shows camera
 * devices with connection status.
 */

import { useCamerasSubsystem } from '@/hooks/useSubsystem';
import { DevicePanel } from '@/components/device';

export function CamerasView() {
  const { cameras } = useCamerasSubsystem();

  if (cameras.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grouse mb-2">No cameras paired.</p>
        <p className="text-sm text-grouse">
          Add cameras to monitor your home remotely.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-grouse mb-4">
        {cameras.length} camera{cameras.length !== 1 ? 's' : ''} configured
      </p>
      {cameras.map((device) => (
        <DevicePanel key={device.id} address={device['base:address']} />
      ))}
    </div>
  );
}
