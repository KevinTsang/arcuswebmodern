'use client';

/**
 * WeatherAlertList — one entry per weather radio sounding a NOAA alert:
 * what the alert is, when it was issued, which radio heard it and the
 * place's county.
 *
 * Ported from src/components/subsystem/weather/alerts/ in the legacy client.
 */

import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import type { WeatherRadioStatus } from '@/hooks/useWeatherSubsystem';
import { formatWeatherAlertTime, getWeatherAlertDescription } from '@/lib/weatherAlerts';

interface WeatherAlertListProps {
  radios: WeatherRadioStatus[];
}

export function WeatherAlertList({ radios }: WeatherAlertListProps) {
  const place = useAppSelector((s) => s.place.place);
  const county = place?.[Place.ATTR_ADDRCOUNTY] as string | undefined;
  const state = (place?.[Place.ATTR_STATE] ?? place?.[Place.ATTR_STATEPROV]) as string | undefined;
  const location = [county ? `${county} County` : null, state].filter(Boolean).join(', ');

  if (radios.length === 0) {
    return (
      <p data-testid="weather-alert-list-empty" className="text-sm text-grouse">
        No active weather alerts.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {radios.map((radio) => (
        <li
          key={radio.address}
          data-testid={`weather-alert-${radio.address}`}
          className="border border-heron rounded-[var(--border-radius-base)] p-3"
        >
          <p className="text-sm font-semibold text-swift">
            {getWeatherAlertDescription(radio.currentAlert)} Issued
          </p>
          <p data-testid={`weather-alert-time-${radio.address}`} className="text-xs text-coot">
            {formatWeatherAlertTime(radio.lastAlertTime)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="icon-platform-weather-alert text-cardinal" />
            <div>
              <p className="text-sm text-swift">{radio.name}</p>
              {location && (
                <p data-testid={`weather-alert-location-${radio.address}`} className="text-xs text-grouse">
                  {location}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
