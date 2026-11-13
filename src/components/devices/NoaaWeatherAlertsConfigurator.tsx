'use client';

/**
 * NoaaWeatherAlertsConfigurator — choose which NOAA alert types a weather
 * radio sounds for. The selection is stored as EAS codes in
 * `noaa:alertsofinterest`.
 *
 * Ported from src/components/device/configurators/noaa-weather-alerts/.
 */

import { useCallback, useMemo, useState } from 'react';
import { WeatherRadio } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { WEATHER_ALERTS, sortAlertsByDescription, type WeatherAlertDefinition } from '@/lib/weatherAlerts';

const EMPTY: string[] = [];

export default function NoaaWeatherAlertsConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const subscribed = (device?.[WeatherRadio.ATTR_ALERTSOFINTEREST] as string[] | undefined) ?? EMPTY;

  const groups = useMemo(() => {
    const mine = new Set(subscribed);
    return [
      { key: 'mine', title: 'My Alerts', alerts: sortAlertsByDescription(WEATHER_ALERTS.filter((a) => mine.has(a.code))) },
      { key: 'popular', title: 'Popular Alerts', alerts: sortAlertsByDescription(WEATHER_ALERTS.filter((a) => a.popular && !mine.has(a.code))) },
      { key: 'more', title: 'More Alerts', alerts: sortAlertsByDescription(WEATHER_ALERTS.filter((a) => !a.popular && !mine.has(a.code))) },
    ];
  }, [subscribed]);

  const handleToggle = useCallback(async (alert: WeatherAlertDefinition) => {
    const next = subscribed.includes(alert.code)
      ? subscribed.filter((c) => c !== alert.code)
      : [...subscribed, alert.code];
    setSaving(true);
    try {
      await setAttribute(WeatherRadio.ATTR_ALERTSOFINTEREST, next);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update weather alerts' }));
    } finally {
      setSaving(false);
    }
  }, [subscribed, setAttribute, dispatch]);

  return (
    <div data-testid="noaa-weather-alerts-configurator">
      <p className="text-sm font-medium text-swift mb-1">Weather Alerts</p>
      <p className="text-xs text-grouse mb-3">
        Alerts can occur at any time of day. Hazards urgent enough may sound and wake people up in
        the middle of the night.
      </p>

      {groups.map((group) => (
        <div key={group.key} data-testid={`noaa-alert-group-${group.key}`} className="mb-3">
          <p className="text-xs font-semibold text-coot uppercase mb-1">{group.title}</p>
          {group.alerts.length === 0 ? (
            <p data-testid={`noaa-alert-group-empty-${group.key}`} className="text-xs text-grouse">None</p>
          ) : (
            <ul className="space-y-1">
              {group.alerts.map((alert) => (
                <li key={alert.code}>
                  <label className="flex items-center gap-2 text-sm text-swift cursor-pointer">
                    <input
                      type="checkbox"
                      checked={group.key === 'mine'}
                      disabled={saving}
                      onChange={() => handleToggle(alert)}
                      data-testid={`noaa-alert-${alert.code}`}
                      className="accent-peacock"
                    />
                    {alert.description}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
