'use client';

import { Base, Color, ColorTemperature } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';

export default function ColorConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute, setAttributes } = useDeviceActions(address);
  const hue = (device?.[Color.ATTR_HUE] as number) ?? 0;
  const saturation = (device?.[Color.ATTR_SATURATION] as number) ?? 100;
  const colortemp = (device?.[ColorTemperature.ATTR_COLORTEMP] as number) ?? 2700;
  const hasColorTemp = (device?.[Base.ATTR_CAPS] as string[] | undefined)?.includes('colortemp');

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-swift">
        Hue: {hue}&deg;
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => setAttributes({ [Color.ATTR_HUE]: Number(e.target.value), [Color.ATTR_SATURATION]: saturation })}
          className="w-full accent-peacock mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-swift">
        Saturation: {saturation}%
        <input
          type="range"
          min={0}
          max={100}
          value={saturation}
          onChange={(e) => setAttribute(Color.ATTR_SATURATION, Number(e.target.value))}
          className="w-full accent-peacock mt-1"
        />
      </label>
      {hasColorTemp && (
        <label className="block text-sm font-medium text-swift">
          Color Temperature: {colortemp}K
          <input
            type="range"
            min={2000}
            max={6500}
            step={100}
            value={colortemp}
            onChange={(e) => setAttribute(ColorTemperature.ATTR_COLORTEMP, Number(e.target.value))}
            className="w-full accent-peacock mt-1"
          />
        </label>
      )}
    </div>
  );
}
