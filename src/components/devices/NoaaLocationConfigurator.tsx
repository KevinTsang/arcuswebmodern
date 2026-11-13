'use client';

/**
 * NoaaLocationConfigurator — choose the state and county a weather radio is
 * in. The county is turned into a NWS S.A.M.E. location code and written to
 * `noaa:location`, which the radio uses to filter the alerts it sounds.
 *
 * Ported from src/components/device/configurators/noaa-location/.
 */

import { useCallback, useEffect, useState } from 'react';
import { NwsSameCodeService, Place, WeatherRadio } from '@arcus/core';
import type { SameState } from '@arcus/core/services/types';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

export default function NoaaLocationConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const place = useAppSelector((s) => s.place.place);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();

  const [states, setStates] = useState<SameState[]>([]);
  const [counties, setCounties] = useState<string[]>([]);
  const [stateCode, setStateCode] = useState<string>(
    () => ((place?.[Place.ATTR_STATE] ?? place?.[Place.ATTR_STATEPROV]) as string | undefined) ?? '',
  );
  const [county, setCounty] = useState<string>(
    () => (place?.[Place.ATTR_ADDRCOUNTY] as string | undefined) ?? '',
  );
  const [saving, setSaving] = useState(false);

  const location = device?.[WeatherRadio.ATTR_LOCATION] as string | undefined;

  useEffect(() => {
    let cancelled = false;
    NwsSameCodeService.ListSameStates()
      .then((result) => {
        if (!cancelled) setStates(result?.sameStates ?? []);
      })
      .catch(() => {
        if (!cancelled) dispatch(addNotification({ type: 'error', message: 'Failed to load states' }));
      });
    return () => { cancelled = true; };
  }, [dispatch]);

  useEffect(() => {
    if (!stateCode) return;
    let cancelled = false;
    NwsSameCodeService.ListSameCounties(stateCode)
      .then((result) => {
        if (!cancelled) setCounties(result?.counties ?? []);
      })
      .catch(() => {
        if (!cancelled) dispatch(addNotification({ type: 'error', message: 'Failed to load counties' }));
      });
    return () => { cancelled = true; };
  }, [stateCode, dispatch]);

  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStateCode(e.target.value);
    setCounty('');
    setCounties([]);
  }, []);

  const handleCountyChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setCounty(next);
    if (!stateCode || !next) return;
    setSaving(true);
    try {
      const { code } = await NwsSameCodeService.GetSameCode(stateCode, next);
      await setAttribute(WeatherRadio.ATTR_LOCATION, code);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update weather radio location' }));
    } finally {
      setSaving(false);
    }
  }, [stateCode, setAttribute, dispatch]);

  return (
    <div data-testid="noaa-location-configurator">
      <p className="text-sm font-medium text-swift mb-1">National Weather Service Location</p>
      <p className="text-xs text-grouse mb-2">
        Select the state and county where the device is located. It uses this to scan for the
        strongest weather radio signal in your area.
      </p>

      {states.length === 0 ? (
        <p data-testid="noaa-location-loading" className="text-xs text-grouse">Loading states…</p>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs text-coot">
            State
            <select
              value={stateCode}
              onChange={handleStateChange}
              data-testid="noaa-location-state"
              className="mt-1 block w-full bg-crane border border-heron rounded-[var(--border-radius-base)] px-2 py-1.5 text-sm text-swift"
            >
              <option value="">-State-</option>
              {states.map((s) => (
                <option key={s.stateCode} value={s.stateCode}>{s.state}</option>
              ))}
            </select>
          </label>

          {counties.length > 0 && (
            <label className="block text-xs text-coot">
              County
              <select
                value={county}
                onChange={handleCountyChange}
                disabled={saving}
                data-testid="noaa-location-county"
                className="mt-1 block w-full bg-crane border border-heron rounded-[var(--border-radius-base)] px-2 py-1.5 text-sm text-swift disabled:opacity-50"
              >
                <option value="">-County-</option>
                {counties.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <p data-testid="noaa-location-code" className="text-xs text-grouse mt-2">
        {location ? `S.A.M.E. code: ${location}` : 'No location set'}
      </p>
    </div>
  );
}
