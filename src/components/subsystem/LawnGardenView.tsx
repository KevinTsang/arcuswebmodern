'use client';

/**
 * LawnGardenView — lawn & garden subsystem with irrigation controllers.
 *
 * Replaces src/components/subsystem/lawn-garden/.
 */

import { Base } from '@arcus/core';
import { useLawnGardenSubsystem } from '@/hooks/useSubsystem';
import { DevicePanel } from '@/components/device';

export function LawnGardenView() {
  const { controllers, zonesWatering, nextEvent } = useLawnGardenSubsystem();

  if (controllers.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grouse">No irrigation controllers paired.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex gap-4">
        <div className={`flex-1 rounded-[var(--border-radius-base)] p-4 text-center ${
          zonesWatering.length > 0 ? 'bg-peacock/10 border border-peacock/30' : 'bg-pigeon/50'
        }`}>
          <div className="text-2xl font-light text-swift">{zonesWatering.length}</div>
          <p className="text-xs text-grouse mt-1">
            Zone{zonesWatering.length !== 1 ? 's' : ''} Watering
          </p>
        </div>
        {nextEvent && (
          <div className="flex-1 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <p className="text-sm text-swift">Next Event</p>
            <p className="text-xs text-grouse mt-1">
              {(nextEvent['zoneName'] as string) ?? 'Zone'}
            </p>
          </div>
        )}
      </div>

      {/* Controllers */}
      <div>
        <h3 className="text-sm font-medium text-swift mb-3">Controllers</h3>
        {controllers.map((device) => (
          <DevicePanel key={device.id} address={device[Base.ATTR_ADDRESS]} />
        ))}
      </div>
    </div>
  );
}
