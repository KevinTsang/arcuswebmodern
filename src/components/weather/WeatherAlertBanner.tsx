'use client';

/**
 * WeatherAlertBanner — persistent banner below the header while the weather
 * radio is sounding a NOAA alert that hasn't been snoozed. Clicking it opens the weather
 * alerts panel, where the alert can be snoozed.
 */

import { useCallback } from 'react';
import { useWeatherSubsystem } from '@/hooks/useWeatherSubsystem';
import { useSidePanel } from '@/components/SidePanel';
import { getWeatherAlertDescription } from '@/lib/weatherAlerts';
import { WeatherAlertsPanel } from './WeatherAlertsPanel';

export function WeatherAlertBanner() {
  const { alertingRadios } = useWeatherSubsystem();
  const { openRight } = useSidePanel();

  const handleOpen = useCallback(() => {
    openRight(<WeatherAlertsPanel />, { title: 'Weather Alerts', key: 'weather-alerts' });
  }, [openRight]);

  if (alertingRadios.length === 0) return null;

  const label = Array.from(
    new Set(alertingRadios.map((r) => getWeatherAlertDescription(r.currentAlert))),
  ).join(', ');

  return (
    <button
      type="button"
      onClick={handleOpen}
      data-testid="weather-alert-banner"
      className="w-full bg-cardinal text-crane px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-cardinal/90 transition-colors"
    >
      <span className="icon-platform-weather-alert text-base animate-pulse" />
      <span data-testid="weather-alert-banner-label">{label} — Tap to view or snooze</span>
    </button>
  );
}
