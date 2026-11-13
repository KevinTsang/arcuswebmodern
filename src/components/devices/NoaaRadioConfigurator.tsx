'use client';

/**
 * NoaaRadioConfigurator — scan for NOAA weather radio stations the device
 * can hear, preview each one through the device's speaker, and pick the
 * station it should monitor for alerts.
 *
 * Ported from src/components/device/configurators/noaa-radio/.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { WeatherRadio } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/** One station from `noaa:ScanStations`. */
export interface WeatherRadioStation {
  /** Station number, 1-7. */
  id: number;
  /** Broadcast frequency, e.g. `162.550 MHz`. */
  freq: string;
  /** Received signal strength; 0 or less means the station can't be heard. */
  rssi: number | string;
}

interface ScanStationsResponse {
  stations?: WeatherRadioStation[];
}

/** How long a station preview plays before the device stops it, in seconds. */
export const PREVIEW_SECONDS = 10;

function signal(station: WeatherRadioStation): number {
  const value = typeof station.rssi === 'number' ? station.rssi : parseFloat(station.rssi);
  return Number.isFinite(value) ? value : 0;
}

export default function NoaaRadioConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const dispatch = useAppDispatch();
  const [stations, setStations] = useState<WeatherRadioStation[]>([]);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = device?.[WeatherRadio.ATTR_STATIONSELECTED] as number | undefined;
  const playing = device?.[WeatherRadio.ATTR_PLAYINGSTATE] === WeatherRadio.PLAYINGSTATE_PLAYING;

  const clearPreviewTimer = useCallback(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current);
      previewTimer.current = null;
    }
  }, []);

  useEffect(() => clearPreviewTimer, [clearPreviewTimer]);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setStations([]);
    try {
      const result = await Bridge.request<ScanStationsResponse>(WeatherRadio.CMD_SCANSTATIONS, address, {});
      const audible = (result?.stations ?? [])
        .filter((s) => signal(s) > 0)
        .sort((a, b) => signal(b) - signal(a));
      setStations(audible);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to scan for weather radio stations' }));
    } finally {
      setScanning(false);
      setScanned(true);
    }
  }, [address, dispatch]);

  const handlePlay = useCallback(async (station: number) => {
    try {
      await Bridge.request(WeatherRadio.CMD_PLAYSTATION, address, { station, time: PREVIEW_SECONDS });
      clearPreviewTimer();
      setPreviewing(station);
      previewTimer.current = setTimeout(() => setPreviewing(null), PREVIEW_SECONDS * 1000);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to play weather radio station' }));
    }
  }, [address, clearPreviewTimer, dispatch]);

  const handleStop = useCallback(async () => {
    try {
      await Bridge.request(WeatherRadio.CMD_STOPPLAYINGSTATION, address, {});
      clearPreviewTimer();
      setPreviewing(null);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to stop weather radio' }));
    }
  }, [address, clearPreviewTimer, dispatch]);

  const handleSelect = useCallback(async (station: number) => {
    try {
      await Bridge.request(WeatherRadio.CMD_SELECTSTATION, address, { station });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to select weather radio station' }));
    }
  }, [address, dispatch]);

  return (
    <div data-testid="noaa-radio-configurator">
      <p className="text-sm font-medium text-swift mb-1">Emergency Weather Station</p>
      <p data-testid="noaa-radio-selected" className="text-xs text-grouse mb-2">
        {selected ? `Monitoring station ${selected}` : 'No station selected'}
      </p>

      {playing && previewing === null && (
        <div className="flex items-center justify-between mb-3 text-sm">
          <span data-testid="noaa-radio-playing" className="text-coot">The radio is playing.</span>
          <button
            type="button"
            onClick={handleStop}
            data-testid="noaa-radio-stop-playing"
            className="px-3 py-1 text-xs bg-pigeon text-coot rounded-[var(--border-radius-base)] hover:bg-heron"
          >
            Stop
          </button>
        </div>
      )}

      {stations.length > 0 && (
        <>
          <p className="text-xs text-grouse mb-2">
            Play each station to find the clearest one. You&apos;ll hear it through the device.
          </p>
          <ul className="space-y-2 mb-3">
            {stations.map((station) => (
              <li
                key={station.id}
                data-testid={`noaa-station-${station.id}`}
                className="flex items-center gap-3"
              >
                {previewing === station.id ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    data-testid={`noaa-station-stop-${station.id}`}
                    aria-label={`Stop station ${station.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-peacock text-crane text-xs"
                  >
                    ■
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handlePlay(station.id)}
                    data-testid={`noaa-station-play-${station.id}`}
                    aria-label={`Play station ${station.id}`}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-pigeon text-coot text-xs hover:bg-heron"
                  >
                    ▶
                  </button>
                )}
                <label className="flex-1 flex items-center justify-between cursor-pointer">
                  <span>
                    <span className="block text-sm text-swift">Station {station.id}</span>
                    <span className="block text-xs text-grouse">{station.freq}</span>
                  </span>
                  <input
                    type="radio"
                    name={`noaa-station-${address}`}
                    checked={selected === station.id}
                    onChange={() => handleSelect(station.id)}
                    data-testid={`noaa-station-select-${station.id}`}
                    className="accent-peacock"
                  />
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {scanned && !scanning && stations.length === 0 && (
        <div data-testid="noaa-radio-weak-signal" className="mb-3">
          <p className="text-sm text-swift">Weak Radio Signal</p>
          <p className="text-xs text-grouse">
            No weather radio stations are within range of this device. Make sure it is connected to
            AC power and that your location is covered by NOAA Weather Radio.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleScan}
        disabled={scanning}
        data-testid="noaa-radio-scan"
        className="px-3 py-1.5 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {scanning ? 'Scanning…' : scanned ? 'Rescan' : 'Scan for Stations'}
      </button>
    </div>
  );
}
