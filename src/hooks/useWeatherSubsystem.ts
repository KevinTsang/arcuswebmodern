/**
 * Weather subsystem hook — reads `subweather` and the NOAA weather radios it
 * tracks, and exposes them as typed records so components don't have to
 * pick attributes out of raw device entities.
 *
 * It's mounted app-wide (the weather alert banner), so it selects only the
 * radio devices: an update to any other device doesn't re-render it.
 *
 * Ported from the view models in the legacy client's
 * src/components/subsystem/weather/alerts/.
 */

import { useMemo } from 'react';
import { shallowEqual } from 'react-redux';
import { Base, Device, WeatherRadio, WeatherSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
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
}

export interface WeatherSubsystemState {
  /** Address of the weather subsystem, when the place has one. */
  address: string | undefined;
  /** Every weather radio at the place. */
  radios: WeatherRadioStatus[];
  /** Radios sounding an alert that hasn't been hushed. */
  alertingRadios: WeatherRadioStatus[];
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
  };
}

const NO_ADDRESSES: string[] = [];

export function useWeatherSubsystem(): WeatherSubsystemState {
  const sub = useSubsystem(WeatherSubsystem.NAMESPACE);
  const radioAddrs = (sub?.[WeatherSubsystem.ATTR_WEATHERRADIOS] as string[] | undefined) ?? NO_ADDRESSES;
  // Just the radios, compared item by item, so other devices' updates don't re-render this.
  const radioDevices = useAppSelector(
    (state) => radioAddrs
      .map((addr) => state.devices.entities[addr])
      .filter((d): d is DeviceEntity => d !== undefined),
    shallowEqual,
  );

  return useMemo(() => {
    const alertingAddrs = new Set((sub?.[WeatherSubsystem.ATTR_ALERTINGRADIOS] as string[] | undefined) ?? []);
    const radios = radioDevices.map(toWeatherRadioStatus);

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
      lastAlertTime: sub?.[WeatherSubsystem.ATTR_LASTWEATHERALERTTIME] as number | undefined,
    };
  }, [sub, radioDevices]);
}
