'use client';

import { useCallback } from 'react';
import { Dimmer } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function BrightnessConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const brightness = (device?.[Dimmer.ATTR_BRIGHTNESS] as number) ?? 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAttribute(Dimmer.ATTR_BRIGHTNESS, Number(e.target.value));
    },
    [setAttribute],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-2">
        Brightness: {brightness}%
        <input
          type="range"
          data-testid="brightness-slider"
          min={0}
          max={100}
          value={brightness}
          onChange={handleChange}
          className="w-full accent-peacock mt-1"
        />
      </label>
    </div>
  );
}
