'use client';

import { WaterSoftener } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { getSaltLevelPercent } from '@/lib/waterDevices';

/**
 * Salt level and salt type guidance (`water-salt-type`).
 */
export function WaterSaltConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const percent = getSaltLevelPercent(device);
  const enabled = device?.[WaterSoftener.ATTR_SALTLEVELENABLED] !== false;

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Salt</p>
      {enabled && percent != null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-coot mb-1">
            <span>Salt Level</span>
            <span data-testid="water-salt-level">{percent}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Salt level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 bg-pigeon rounded-full overflow-hidden"
          >
            <div className="h-full bg-peacock" style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}
      {!enabled && (
        <p data-testid="water-salt-level-disabled" className="text-xs text-grouse mb-2">
          Salt level monitoring is turned off on this softener.
        </p>
      )}
      <p className="text-xs text-grouse">
        Recommended salt types are nugget, pellet, or coarse solar salts with less than 1% impurities.
      </p>
    </div>
  );
}
