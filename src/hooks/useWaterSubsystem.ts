import { useMemo } from 'react';
import { Base, WaterSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';

export function useWaterSubsystem() {
  const sub = useSubsystem('subwater');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const waterAddrs = (sub?.[WaterSubsystem.ATTR_WATERDEVICES] as string[]) ?? [];
    const closedValveAddrs = (sub?.[WaterSubsystem.ATTR_CLOSEDWATERVALVES] as string[]) ?? [];
    const waterDevices = allDevices.filter((d) => waterAddrs.includes(d[Base.ATTR_ADDRESS]));

    return {
      subsystem: sub,
      waterDevices,
      closedValveCount: closedValveAddrs.length,
    };
  }, [sub, allDevices]);
}
