import { useMemo } from 'react';
import { Base, WaterSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import type { DeviceEntity } from '@/store/entityTypes';
import { useSubsystem } from './useSubsystem';

export function useWaterSubsystem() {
  const sub = useSubsystem('subwater');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const byAddress = (addrs: string[]): DeviceEntity[] =>
      allDevices.filter((d) => addrs.includes(d[Base.ATTR_ADDRESS]));
    const list = (attr: string): string[] => {
      const value = sub?.[attr];
      return Array.isArray(value) ? (value as string[]) : [];
    };
    const single = (attr: string): DeviceEntity | null => {
      const addr = sub?.[attr];
      if (typeof addr !== 'string' || !addr) return null;
      return allDevices.find((d) => d[Base.ATTR_ADDRESS] === addr) ?? null;
    };

    return {
      subsystem: sub,
      waterDevices: byAddress(list(WaterSubsystem.ATTR_WATERDEVICES)),
      closedValveCount: list(WaterSubsystem.ATTR_CLOSEDWATERVALVES).length,
      primaryWaterHeater: single(WaterSubsystem.ATTR_PRIMARYWATERHEATER),
      primaryWaterSoftener: single(WaterSubsystem.ATTR_PRIMARYWATERSOFTENER),
      lowSaltDevices: byAddress(list(WaterSubsystem.ATTR_LOWSALTDEVICES)),
      continuousUseDevices: byAddress(list(WaterSubsystem.ATTR_CONTINUOUSWATERUSEDEVICES)),
      excessiveUseDevices: byAddress(list(WaterSubsystem.ATTR_EXCESSIVEWATERUSEDEVICES)),
    };
  }, [sub, allDevices]);
}
