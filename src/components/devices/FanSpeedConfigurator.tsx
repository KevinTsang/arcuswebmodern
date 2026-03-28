'use client';

import { Fan } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function FanSpeedConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const speed = (device?.[Fan.ATTR_SPEED] as number) ?? 0;

  const speeds = [
    { value: 0, label: 'Off' },
    { value: 33, label: 'Low' },
    { value: 66, label: 'Medium' },
    { value: 100, label: 'High' },
  ];

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Fan Speed</p>
      <div className="flex gap-2">
        {speeds.map((s) => (
          <button
            key={s.value}
            onClick={() => setAttribute(Fan.ATTR_SPEED, s.value)}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${speed === s.value
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
