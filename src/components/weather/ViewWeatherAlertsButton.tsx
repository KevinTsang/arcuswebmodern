'use client';

/**
 * ViewWeatherAlertsButton — link-style button that opens the weather alerts
 * side panel, where active NOAA alerts can be reviewed and snoozed.
 */

import { useCallback } from 'react';
import { useSidePanel } from '@/components/SidePanel';
import { WeatherAlertsPanel } from './WeatherAlertsPanel';

export function ViewWeatherAlertsButton() {
  const { openRight } = useSidePanel();

  const handleClick = useCallback(() => {
    openRight(<WeatherAlertsPanel />, { title: 'Weather Alerts', key: 'weather-alerts' });
  }, [openRight]);

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="weather-view-alerts"
      className="text-sm text-peacock hover:underline"
    >
      View or snooze alerts
    </button>
  );
}
