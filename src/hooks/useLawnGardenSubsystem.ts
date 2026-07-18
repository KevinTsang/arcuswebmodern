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
    // `zonesWatering` is a map keyed by controller address, not an array, so it
    // has no `.length` — convert its values to a list (mirrors legacy `values(...)`).
    // Casting it as an array made `zonesWatering.length` render as "undefined".
    const zonesWateringMap =
      (sub?.[LawnNGardenSubsystem.ATTR_ZONESWATERING] as Record<string, ZoneWateringEntry> | undefined) ?? {};
    const zonesWatering = Object.values(zonesWateringMap);
    const nextEvent = sub?.[LawnNGardenSubsystem.ATTR_NEXTEVENT] as LawnGardenEvent | undefined;

    return {
      subsystem: sub,
      controllers,
      zonesWatering,
      nextEvent,
    };
  }, [sub, allDevices]);
}
