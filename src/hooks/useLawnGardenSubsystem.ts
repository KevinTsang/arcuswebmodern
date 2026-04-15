import { useMemo } from 'react';
import { Base, LawnNGardenSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';
import type { ZoneWateringEntry, LawnGardenEvent } from '@/store/entityTypes';

export function useLawnGardenSubsystem() {
  const sub = useSubsystem('sublawnngarden');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const controllerAddrs = (sub?.[LawnNGardenSubsystem.ATTR_CONTROLLERS] as string[]) ?? [];
    const controllers = allDevices.filter((d) => controllerAddrs.includes(d[Base.ATTR_ADDRESS]));
    const zonesWatering = (sub?.[LawnNGardenSubsystem.ATTR_ZONESWATERING] as ZoneWateringEntry[]) ?? [];
    const nextEvent = sub?.[LawnNGardenSubsystem.ATTR_NEXTEVENT] as LawnGardenEvent | undefined;

    return {
      subsystem: sub,
      controllers,
      zonesWatering,
      nextEvent,
    };
  }, [sub, allDevices]);
}
