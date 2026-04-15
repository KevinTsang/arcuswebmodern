'use client';

/**
 * DoorsLocksView — doors & locks subsystem status.
 *
 * Replaces src/components/subsystem/doors-locks/. Shows locks,
 * door sensors, motorized doors, and pet doors with status.
 */

import { Base } from '@arcus/core';
import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import { DevicePanel } from '@/components/devices';
import type { DeviceEntity } from '@/store/entityTypes';

export function DoorsLocksView() {
  const { locks, motorized, contacts, petDoors, unlockedCount, openCount, totalDevices } =
    useDoorsLocksSubsystem();

  if (totalDevices === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-grouse">No door or lock devices paired.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex gap-4">
        {locks.length > 0 && (
          <div className={`flex-1 rounded-[var(--border-radius-base)] p-4 text-center ${
            unlockedCount > 0 ? 'bg-canary/10 border border-canary/30' : 'bg-pigeon/50'
          }`}>
            <div className="text-2xl font-light text-swift">{unlockedCount}</div>
            <p className="text-xs text-grouse mt-1">Unlocked</p>
          </div>
        )}
        {(contacts.length > 0 || motorized.length > 0) && (
          <div className={`flex-1 rounded-[var(--border-radius-base)] p-4 text-center ${
            openCount > 0 ? 'bg-canary/10 border border-canary/30' : 'bg-pigeon/50'
          }`}>
            <div className="text-2xl font-light text-swift">{openCount}</div>
            <p className="text-xs text-grouse mt-1">Open</p>
          </div>
        )}
      </div>

      {/* Locks */}
      {locks.length > 0 && (
        <DeviceSection title="Locks" devices={locks} />
      )}

      {/* Garage/Motorized Doors */}
      {motorized.length > 0 && (
        <DeviceSection title="Garage Doors" devices={motorized} />
      )}

      {/* Contact Sensors */}
      {contacts.length > 0 && (
        <DeviceSection title="Door & Window Sensors" devices={contacts} />
      )}

      {/* Pet Doors */}
      {petDoors.length > 0 && (
        <DeviceSection title="Pet Doors" devices={petDoors} />
      )}
    </div>
  );
}

function DeviceSection({ title, devices }: { title: string; devices: DeviceEntity[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-swift mb-3">{title}</h3>
      {devices.map((device) => (
        <DevicePanel key={device.id} address={device[Base.ATTR_ADDRESS]} />
      ))}
    </div>
  );
}
