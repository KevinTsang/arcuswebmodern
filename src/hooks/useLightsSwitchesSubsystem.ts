import { useMemo } from 'react';
import { Base, Switch, LightsNSwitchesSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';

export function useLightsSwitchesSubsystem() {
  const sub = useSubsystem('sublightsnswitches');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const switchAddrs = (sub?.[LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES] as string[]) ?? [];
    const devices = allDevices.filter((d) => switchAddrs.includes(d[Base.ATTR_ADDRESS]));
    const onCount = devices.filter((d) => d[Switch.ATTR_STATE] === Switch.STATE_ON).length;

    return {
      subsystem: sub,
      devices,
      onCount,
      totalCount: devices.length,
    };
  }, [sub, allDevices]);
}
