import { useMemo } from 'react';
import { Base, DoorLock, Contact, MotorizedDoor, DoorsNLocksSubsystem } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { useSubsystem } from './useSubsystem';
import type { ChimeConfig } from '@/store/entityTypes';

export function useDoorsLocksSubsystem() {
  const sub = useSubsystem('subdoorsnlocks');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const lockAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_LOCKDEVICES] as string[]) ?? [];
    const motorizedAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES] as string[]) ?? [];
    const contactAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES] as string[]) ?? [];
    const petDoorAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_PETDOORDEVICES] as string[]) ?? [];
    const chimeConfig = (sub?.[DoorsNLocksSubsystem.ATTR_CHIMECONFIG] as ChimeConfig) ?? {};

    const locks = allDevices.filter((d) => lockAddrs.includes(d[Base.ATTR_ADDRESS]));
    const motorized = allDevices.filter((d) => motorizedAddrs.includes(d[Base.ATTR_ADDRESS]));
    const contacts = allDevices.filter((d) => contactAddrs.includes(d[Base.ATTR_ADDRESS]));
    const petDoors = allDevices.filter((d) => petDoorAddrs.includes(d[Base.ATTR_ADDRESS]));

    const unlockedCount = locks.filter((d) => d[DoorLock.ATTR_LOCKSTATE] === DoorLock.LOCKSTATE_UNLOCKED).length;
    const openCount = contacts.filter((d) => d[Contact.ATTR_CONTACT] === Contact.CONTACT_OPENED).length
      + motorized.filter((d) => (d[MotorizedDoor.ATTR_DOORSTATE] as string) !== MotorizedDoor.DOORSTATE_CLOSED).length;

    return {
      subsystem: sub,
      locks,
      motorized,
      contacts,
      petDoors,
      chimeConfig,
      unlockedCount,
      openCount,
      totalDevices: locks.length + motorized.length + contacts.length + petDoors.length,
    };
  }, [sub, allDevices]);
}
