import { useMemo } from 'react';
import { Base, PresenceSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { useSubsystem } from './useSubsystem';

export function useHomeFamilySubsystem() {
  const sub = useSubsystem('subspres');
  const people = useAppSelector(selectAllPeople);

  return useMemo(() => {
    const peopleAtHomeAddrs = (sub?.[PresenceSubsystem.ATTR_PEOPLEATHOME] as string[]) ?? [];
    const peopleAwayAddrs = (sub?.[PresenceSubsystem.ATTR_PEOPLEAWAY] as string[]) ?? [];
    const devicesAtHomeAddrs = (sub?.[PresenceSubsystem.ATTR_DEVICESATHOME] as string[]) ?? [];
    const devicesAwayAddrs = (sub?.[PresenceSubsystem.ATTR_DEVICESAWAY] as string[]) ?? [];

    const peopleAtHome = people.filter((p) => peopleAtHomeAddrs.includes(p[Base.ATTR_ADDRESS]));
    const peopleAway = people.filter((p) => peopleAwayAddrs.includes(p[Base.ATTR_ADDRESS]));

    return {
      subsystem: sub,
      peopleAtHome,
      peopleAway,
      devicesAtHomeCount: devicesAtHomeAddrs.length,
      devicesAwayCount: devicesAwayAddrs.length,
    };
  }, [sub, people]);
}
