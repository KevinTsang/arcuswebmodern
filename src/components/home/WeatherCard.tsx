'use client';

/**
 * WeatherCard — dashboard card with the place's current weather-alert
 * conditions: whether any NOAA alert is sounding, when the last alert was
 * issued, and the state of each weather radio. Hidden when the place has
 * no weather radios.
 */

import { WeatherRadio } from '@arcus/core';
import { useWeatherSubsystem, type WeatherRadioStatus } from '@/hooks/useWeatherSubsystem';
import { ViewWeatherAlertsButton } from '@/components/weather/ViewWeatherAlertsButton';
import { formatWeatherAlertTime, getWeatherAlertDescription } from '@/lib/weatherAlerts';
import CardShell from './CardShell';
import StatusBadge from './StatusBadge';

function radioStatus(radio: WeatherRadioStatus): string {
  if (radio.alertState === WeatherRadio.ALERTSTATE_ALERT) {
    return getWeatherAlertDescription(radio.currentAlert);
  }
  if (radio.alertState === WeatherRadio.ALERTSTATE_HUSHED) return 'Alert snoozed';
  if (radio.playingState === WeatherRadio.PLAYINGSTATE_PLAYING) return 'Playing station';
  return 'No alerts';
}

export default function WeatherCard() {
  const { radios, alertingRadios, lastAlertTime } = useWeatherSubsystem();

  if (radios.length === 0) return null;

  const alerting = alertingRadios.length > 0;

  return (
    <CardShell title="Weather" icon="icon-platform-weather-alert">
      <div className="flex gap-4">
        <StatusBadge
          label="Status"
          value={alerting ? 'Alert' : 'All Clear'}
          color={alerting ? 'text-cardinal' : 'text-lovebird'}
        />
        <StatusBadge label="Radios" value={String(radios.length)} color="text-grouse" />
        <StatusBadge
          label="Last Alert"
          value={lastAlertTime ? formatWeatherAlertTime(lastAlertTime) : 'None'}
          color="text-grouse"
        />
      </div>

      <ul className="mt-3 space-y-1">
        {radios.map((radio) => (
          <li
            key={radio.address}
            data-testid={`weather-radio-${radio.address}`}
            className="flex justify-between text-sm"
          >
            <span className="text-swift">{radio.name}</span>
            <span
              data-testid={`weather-radio-status-${radio.address}`}
              className={radio.alertState === WeatherRadio.ALERTSTATE_ALERT ? 'text-cardinal' : 'text-grouse'}
            >
              {radioStatus(radio)}
            </span>
          </li>
        ))}
      </ul>

      {alerting && (
        <div className="mt-3">
          <ViewWeatherAlertsButton />
        </div>
      )}
    </CardShell>
  );
}
