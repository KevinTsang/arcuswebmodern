'use client';

import { WaterHardness } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';

/**
 * Read-only water hardness (`water-hardness`). Hardness is set on the
 * softener itself; the platform only reports it.
 */
export function WaterHardnessConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const hardness = device?.[WaterHardness.ATTR_HARDNESS] as number | undefined;

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Water Hardness Level</p>
      <p className="text-xs text-grouse mb-2">
        Your water hardness level is{' '}
        <strong data-testid="water-hardness-value" className="text-swift">
          {typeof hardness === 'number' ? `${hardness} gpg` : 'not reported'}
        </strong>{' '}
        (grains per gallon). This varies by location and water source.
      </p>
      <p className="text-xs text-grouse">
        To change it, refer to the owner&apos;s manual and update the setting on the device itself. Your
        municipality or a water test kit can tell you your water hardness.
      </p>
    </div>
  );
}
