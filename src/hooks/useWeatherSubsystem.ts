/**
 * Weather subsystem hook — reads `subweather` and the NOAA weather radios it
 * tracks, and exposes them as typed records so components don't have to
 * pick attributes out of raw device entities.
 *
 * Ported from the view models in the legacy client's
 * src/components/subsystem/weather/alerts/.
 */

import { useMemo } from 'react';
import { Base, Device, WeatherRadio, WeatherSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import type { DeviceEntity } from '@/store/entityTypes';
import { useSubsystem } from './useSubsystem';

/** The `noaa` capability attributes of one weather radio. */
export interface WeatherRadioStatus {
  address: string;
  name: string;
  /** `ALERT`, `NO_ALERT` or `HUSHED`. */
  alertState: string | undefined;
  /** `PLAYING` or `QUIET`. */
  playingState: string | undefined;
  /** EAS code of the active alert, or `NONE`. */
  currentAlert: string | undefined;
  lastAlertTime: number | undefined;
  stationSelected: number | undefined;
  frequency: string | undefined;
}

export interface WeatherSubsystemState {
  /** Address of the weather subsystem, when the place has one. */
  address: string | undefined;
  /** Every weather radio at the place. */
  radios: WeatherRadioStatus[];
  /** Radios sounding an alert that hasn't been hushed. */
  alertingRadios: WeatherRadioStatus[];
  /** True while `subweather:weatherAlert` is `ALERT`. */
  alertActive: boolean;
  lastAlertTime: number | undefined;
}

export function toWeatherRadioStatus(device: DeviceEntity): WeatherRadioStatus {
  return {
    address: device[Base.ATTR_ADDRESS],
    name: device[Device.ATTR_NAME] ?? 'Weather Radio',
    alertState: device[WeatherRadio.ATTR_ALERTSTATE] as string | undefined,
    playingState: device[WeatherRadio.ATTR_PLAYINGSTATE] as string | undefined,
    currentAlert: device[WeatherRadio.ATTR_CURRENTALERT] as string | undefined,
    lastAlertTime: device[WeatherRadio.ATTR_LASTALERTTIME] as number | undefined,
    stationSelected: device[WeatherRadio.ATTR_STATIONSELECTED] as number | undefined,
    frequency: device[WeatherRadio.ATTR_FREQUENCY] as string | undefined,
  };
}

export function useWeatherSubsystem(): WeatherSubsystemState {
  const sub = useSubsystem(WeatherSubsystem.NAMESPACE);
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const radioAddrs = (sub?.[WeatherSubsystem.ATTR_WEATHERRADIOS] as string[] | undefined) ?? [];
    const alertingAddrs = new Set((sub?.[WeatherSubsystem.ATTR_ALERTINGRADIOS] as string[] | undefined) ?? []);

    const radios = allDevices
      .filter((d) => radioAddrs.includes(d[Base.ATTR_ADDRESS]))
      .map(toWeatherRadioStatus);

    // A radio counts as alerting when the subsystem lists it or it reports
    // ALERT itself (in case the subsystem lags), unless it has been hushed.
    const alertingRadios = radios.filter(
      (r) => (alertingAddrs.has(r.address) || r.alertState === WeatherRadio.ALERTSTATE_ALERT)
        && r.alertState !== WeatherRadio.ALERTSTATE_HUSHED,
    );

    return {
      address: sub?.[Base.ATTR_ADDRESS],
      radios,
      alertingRadios,
      alertActive: sub?.[WeatherSubsystem.ATTR_WEATHERALERT] === WeatherSubsystem.WEATHERALERT_ALERT,
      lastAlertTime: sub?.[WeatherSubsystem.ATTR_LASTWEATHERALERTTIME] as number | undefined,
    };
  }, [sub, allDevices]);
}
