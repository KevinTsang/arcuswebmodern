'use client';

/**
 * NoaaLocationConfigurator — choose the state and county a weather radio is
 * in. The county is turned into a NWS S.A.M.E. location code and written to
 * `noaa:location`, which the radio uses to filter the alerts it sounds.
 *
 * Picking a county saves it. The state and county start from the place's
 * address; when the radio has no location yet, a Save button saves that
 * prefilled county, since choosing the county already shown fires no change.
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
import { placeStateCode } from '@/lib/weatherAlerts';

type LoadStatus = 'loading' | 'loaded' | 'failed';

const retryClass = 'px-3 py-1 text-xs bg-pigeon text-coot rounded-[var(--border-radius-base)] hover:bg-heron';

export default function NoaaLocationConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const place = useAppSelector((s) => s.place.place);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();

  const [states, setStates] = useState<SameState[]>([]);
  const [statesStatus, setStatesStatus] = useState<LoadStatus>('loading');
  const [statesAttempt, setStatesAttempt] = useState(0);
  const [counties, setCounties] = useState<string[]>([]);
  const [countiesStatus, setCountiesStatus] = useState<LoadStatus>('loading');
  const [countiesAttempt, setCountiesAttempt] = useState(0);
  const [stateCode, setStateCode] = useState<string>(() => placeStateCode(place));
  const [county, setCounty] = useState<string>(
    () => (place?.[Place.ATTR_ADDRCOUNTY] as string | undefined) || '',
  );
  const [saving, setSaving] = useState(false);

  const location = device?.[WeatherRadio.ATTR_LOCATION] as string | undefined;

  useEffect(() => {
    let cancelled = false;
    NwsSameCodeService.ListSameStates()
      .then((result) => {
        if (cancelled) return;
        setStates(result?.sameStates ?? []);
        setStatesStatus('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setStatesStatus('failed');
        dispatch(addNotification({ type: 'error', message: 'Failed to load states' }));
      });
    return () => { cancelled = true; };
  }, [dispatch, statesAttempt]);

  useEffect(() => {
    if (!stateCode) return;
    let cancelled = false;
    NwsSameCodeService.ListSameCounties(stateCode)
      .then((result) => {
        if (cancelled) return;
        setCounties(result?.counties ?? []);
        setCountiesStatus('loaded');
      })
      .catch(() => {
        if (cancelled) return;
        setCountiesStatus('failed');
        dispatch(addNotification({ type: 'error', message: 'Failed to load counties' }));
      });
    return () => { cancelled = true; };
  }, [stateCode, dispatch, countiesAttempt]);

  const retryStates = useCallback(() => {
    setStatesStatus('loading');
    setStatesAttempt((n) => n + 1);
  }, []);

  const retryCounties = useCallback(() => {
    setCountiesStatus('loading');
    setCountiesAttempt((n) => n + 1);
  }, []);

  const saveLocation = useCallback(async (state: string, countyName: string) => {
    setSaving(true);
    try {
      const { code } = await NwsSameCodeService.GetSameCode(state, countyName);
      await setAttribute(WeatherRadio.ATTR_LOCATION, code);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update weather radio location' }));
    } finally {
      setSaving(false);
    }
  }, [setAttribute, dispatch]);

  const handleStateChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStateCode(e.target.value);
    setCounty('');
    setCounties([]);
    setCountiesStatus('loading');
  }, []);

  const handleCountyChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setCounty(next);
    if (stateCode && next) void saveLocation(stateCode, next);
  }, [stateCode, saveLocation]);

  const handleSavePrefilled = useCallback(() => {
    if (stateCode && county) void saveLocation(stateCode, county);
  }, [stateCode, county, saveLocation]);

  const canSavePrefilled = !location && !!stateCode && !!county && counties.includes(county);

  return (
    <div data-testid="noaa-location-configurator">
      <p className="text-sm font-medium text-swift mb-1">National Weather Service Location</p>
      <p className="text-xs text-grouse mb-2">
        Select the state and county where the device is located. It uses this to scan for the
        strongest weather radio signal in your area.
      </p>

      {statesStatus === 'loading' && (
        <p data-testid="noaa-location-loading" className="text-xs text-grouse">Loading states…</p>
      )}

      {statesStatus === 'failed' && (
        <div data-testid="noaa-location-states-failed" className="flex items-center justify-between gap-2 text-xs text-cardinal">
          <span>Couldn&apos;t load the list of states.</span>
          <button type="button" onClick={retryStates} data-testid="noaa-location-states-retry" className={retryClass}>
            Retry
          </button>
        </div>
      )}

      {statesStatus === 'loaded' && (
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

          {stateCode && countiesStatus === 'failed' && (
            <div data-testid="noaa-location-counties-failed" className="flex items-center justify-between gap-2 text-xs text-cardinal">
              <span>Couldn&apos;t load the counties for this state.</span>
              <button type="button" onClick={retryCounties} data-testid="noaa-location-counties-retry" className={retryClass}>
                Retry
              </button>
            </div>
          )}

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

          {canSavePrefilled && (
            <button
              type="button"
              onClick={handleSavePrefilled}
              disabled={saving}
              data-testid="noaa-location-save"
              className="px-3 py-1.5 text-xs bg-peacock text-crane rounded-[var(--border-radius-base)] hover:bg-peacock/90 disabled:opacity-50"
            >
              {saving ? 'Saving…' : `Save ${county} County`}
            </button>
          )}
        </div>
      )}

      <p data-testid="noaa-location-code" className="text-xs text-grouse mt-2">
        {location ? `S.A.M.E. code: ${location}` : 'No location set'}
      </p>
    </div>
  );
}
