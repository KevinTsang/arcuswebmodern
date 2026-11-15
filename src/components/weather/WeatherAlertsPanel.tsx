'use client';

/**
 * WeatherAlertsPanel — side panel listing the active NOAA weather alerts
 * with a Snooze control that silences every radio sounding an alert
 * (`subweather:SnoozeAllAlerts`).
 *
 * Ported from src/components/subsystem/weather/alerts/ in the legacy client.
 */

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { WeatherSubsystem } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useWeatherSubsystem } from '@/hooks/useWeatherSubsystem';
import { useSidePanel } from '@/components/SidePanel';
import { WeatherAlertList } from './WeatherAlertList';

export function WeatherAlertsPanel() {
  const { address, alertingRadios } = useWeatherSubsystem();
  const { closeRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [snoozing, setSnoozing] = useState(false);

  const handleSnooze = useCallback(async () => {
    if (!address) return;
    setSnoozing(true);
    try {
      await Bridge.request(WeatherSubsystem.CMD_SNOOZEALLALERTS, address, {});
      dispatch(addNotification({ type: 'success', message: 'Weather alerts snoozed' }));
      closeRight();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to snooze weather alerts' }));
    } finally {
      setSnoozing(false);
    }
  }, [address, closeRight, dispatch]);

  return (
    <div data-testid="weather-alerts-panel" className="space-y-4">
      <h3 className="flex items-center gap-2 text-base font-semibold text-swift">
        <span className="icon-platform-weather-alert text-cardinal" />
        Weather Radio Alert
      </h3>

      <WeatherAlertList radios={alertingRadios} />

      {alertingRadios.length > 0 && (
        <div className="space-y-3 border-t border-heron pt-4">
          <p className="text-sm text-coot">Snooze to stop the audible notifications.</p>
          <p className="text-xs text-grouse italic">
            If anything changes about this alert (such as its end time or type), the device&apos;s
            speaker will let you know.
          </p>
          <button
            type="button"
            onClick={handleSnooze}
            disabled={snoozing || !address}
            data-testid="weather-alerts-snooze"
            className="px-4 py-2 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {snoozing ? 'Snoozing…' : 'Snooze'}
          </button>
          <p className="text-xs text-grouse">
            To unsubscribe from an alert type, open the radio&apos;s configuration under Devices.
          </p>
        </div>
      )}
    </div>
  );
}
