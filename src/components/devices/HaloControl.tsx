'use client';

import { useState, useCallback } from 'react';
import { Base, DevicePower, WeatherRadio } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import ToggleOnOff from './ToggleOnOff';

/**
 * Halo row control: the nightlight toggle and, on a Halo Plus (which has a
 * NOAA weather radio), Play/Stop Radio. The light and radio only work on line
 * power, so on battery the control shows "Light Disabled" instead.
 */
export default function HaloControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const pluggedIn = device?.[DevicePower.ATTR_SOURCE] === DevicePower.SOURCE_LINE;
  const hasRadio = (device?.[Base.ATTR_CAPS] ?? []).includes(WeatherRadio.NAMESPACE);
  const playing = device?.[WeatherRadio.ATTR_PLAYINGSTATE] === WeatherRadio.PLAYINGSTATE_PLAYING;
  const station = device?.[WeatherRadio.ATTR_STATIONSELECTED] as number | undefined;

  const handleRadio = useCallback(async () => {
    setPending(true);
    try {
      if (playing) {
        await sendCommand(WeatherRadio.CMD_STOPPLAYINGSTATION, {});
      } else {
        // time -1 plays until stopped
        await sendCommand(WeatherRadio.CMD_PLAYSTATION, { station, time: -1 });
      }
    } catch {
      dispatch(addNotification({
        type: 'error',
        message: playing ? 'Failed to stop the weather radio' : 'Failed to play the weather radio',
      }));
    }
    setPending(false);
  }, [playing, station, sendCommand, dispatch]);

  if (!device) return null;

  if (!pluggedIn) {
    return (
      <span data-testid={`halo-light-disabled-${address}`} className="text-xs font-medium text-cardinal">
        Light Disabled
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hasRadio && (
        <button
          onClick={handleRadio}
          disabled={pending || (!playing && station == null)}
          aria-pressed={playing}
          data-testid={`halo-radio-${address}`}
          className="px-3 py-1.5 text-sm font-medium rounded-[var(--border-radius-base)] bg-pigeon text-coot hover:bg-heron disabled:opacity-50"
        >
          {pending ? '...' : playing ? 'Stop Radio' : 'Play Radio'}
        </button>
      )}
      <ToggleOnOff address={address} />
    </div>
  );
}
