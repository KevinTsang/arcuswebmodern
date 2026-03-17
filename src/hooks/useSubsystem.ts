/**
 * Hooks for accessing subsystem data from Redux state.
 *
 * Provides typed access to subsystem attributes, device lists,
 * and status information.
 */

import { useMemo } from 'react';
import {
  Base, Switch, DoorLock, Contact, MotorizedDoor, Temperature, RelativeHumidity,
  SecuritySubsystem, AlarmSubsystem, ClimateSubsystem, DoorsNLocksSubsystem,
  PresenceSubsystem, CareSubsystem, CamerasSubsystem, LawnNGardenSubsystem,
  WaterSubsystem, LightsNSwitchesSubsystem,
} from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { selectAllPeople } from '@/store/slices/peopleSlice';
import { type SubsystemConfigEntry, subsystemConfigs } from '@/lib/subsystemConfig';

type SubsystemObj = Record<string, unknown>;

/**
 * Find a subsystem entity by its namespace prefix (e.g., 'subalarm').
 */
export function useSubsystem(namespace: string): SubsystemObj | undefined {
  const subsystems = useAppSelector(selectAllSubsystems);
  return useMemo(() => {
    return subsystems.find((s) => {
      const addr = s[Base.ATTR_ADDRESS] as string;
      return addr?.startsWith(`SERV:${namespace}:`);
    });
  }, [subsystems, namespace]);
}

/**
 * Get all visible subsystems with their config and entity data.
 */
export function useVisibleSubsystems(): Array<{
  config: SubsystemConfigEntry;
  subsystem: SubsystemObj | undefined;
}> {
  const subsystems = useAppSelector(selectAllSubsystems);
  return useMemo(() => {
    return subsystemConfigs
      .filter((c) => c.visible)
      .map((config) => ({
        config,
        subsystem: subsystems.find((s) => {
          const addr = s[Base.ATTR_ADDRESS] as string;
          return addr?.startsWith(`SERV:${config.namespace}:`);
        }),
      }));
  }, [subsystems]);
}

/**
 * Get device entities associated with a subsystem from its device address lists.
 */
export function useSubsystemDevices(namespace: string, deviceAttributes: string[]) {
  const subsystem = useSubsystem(namespace);
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    if (!subsystem) return [];
    const addresses = new Set<string>();
    for (const attr of deviceAttributes) {
      const list = subsystem[attr] as string[] | undefined;
      if (list) {
        for (const addr of list) addresses.add(addr);
      }
    }
    return allDevices.filter((d) => addresses.has(d[Base.ATTR_ADDRESS]));
  }, [subsystem, deviceAttributes, allDevices]);
}

// ── Subsystem-Specific Hooks ──────────────────────────────────────────

/** Alarm subsystem state */
export function useAlarmSubsystem() {
  const security = useSubsystem('subsecurity');
  const safety = useSubsystem('subsafety');
  const alarm = useSubsystem('subalarm');

  return useMemo(() => {
    const securityMode = (security?.[SecuritySubsystem.ATTR_ALARMMODE] as string) ?? SecuritySubsystem.ALARMMODE_OFF;
    const securityState = (security?.[SecuritySubsystem.ATTR_ALARMSTATE] as string) ?? SecuritySubsystem.ALARMSTATE_DISARMED;
    const currentIncident = security?.['subsecurity:currentIncident'] as string | undefined;
    const securityDevices = (security?.[SecuritySubsystem.ATTR_SECURITYDEVICES] as string[]) ?? [];
    const triggeredDevices = (security?.[SecuritySubsystem.ATTR_TRIGGEREDDEVICES] as string[]) ?? [];
    const offlineDevices = (security?.[SecuritySubsystem.ATTR_OFFLINEDEVICES] as string[]) ?? [];
    const recordOnSecurity = (alarm?.[AlarmSubsystem.ATTR_RECORDONSECURITY] as boolean) ?? false;
    const fanShutoffOnSmoke = (alarm?.[AlarmSubsystem.ATTR_FANSHUTOFFONSMOKE] as boolean) ?? false;
    const fanShutoffOnCO = (alarm?.[AlarmSubsystem.ATTR_FANSHUTOFFONCO] as boolean) ?? false;

    return {
      securityMode,
      securityState,
      currentIncident,
      securityDevices,
      triggeredDevices,
      offlineDevices,
      recordOnSecurity,
      fanShutoffOnSmoke,
      fanShutoffOnCO,
      securitySubsystem: security,
      safetySubsystem: safety,
      alarmSubsystem: alarm,
    };
  }, [security, safety, alarm]);
}

/** Climate subsystem state */
export function useClimateSubsystem() {
  const sub = useSubsystem('subclimate');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const primaryTempDevice = sub?.[ClimateSubsystem.ATTR_PRIMARYTEMPERATUREDEVICE] as string | undefined;
    const primaryHumidDevice = sub?.[ClimateSubsystem.ATTR_PRIMARYHUMIDITYDEVICE] as string | undefined;
    const tempDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_TEMPERATUREDEVICES] as string[]) ?? [];
    const humidDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_HUMIDITYDEVICES] as string[]) ?? [];
    const controlDeviceAddrs = (sub?.[ClimateSubsystem.ATTR_CONTROLDEVICES] as string[]) ?? [];

    const controlDevices = allDevices.filter((d) => controlDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));
    const tempDevices = allDevices.filter((d) => tempDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));
    const humidDevices = allDevices.filter((d) => humidDeviceAddrs.includes(d[Base.ATTR_ADDRESS]));

    // Get primary readings
    const primaryTempEntity = primaryTempDevice
      ? allDevices.find((d) => d[Base.ATTR_ADDRESS] === primaryTempDevice)
      : tempDevices[0];
    const primaryHumidEntity = primaryHumidDevice
      ? allDevices.find((d) => d[Base.ATTR_ADDRESS] === primaryHumidDevice)
      : humidDevices[0];

    const temperature = primaryTempEntity?.[Temperature.ATTR_TEMPERATURE] as number | undefined;
    const humidity = primaryHumidEntity?.[RelativeHumidity.ATTR_HUMIDITY] as number | undefined;

    return {
      subsystem: sub,
      temperature,
      humidity,
      controlDevices,
      tempDevices,
      humidDevices,
    };
  }, [sub, allDevices]);
}

/** Doors & Locks subsystem state */
export function useDoorsLocksSubsystem() {
  const sub = useSubsystem('subdoorsnlocks');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const lockAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_LOCKDEVICES] as string[]) ?? [];
    const motorizedAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES] as string[]) ?? [];
    const contactAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES] as string[]) ?? [];
    const petDoorAddrs = (sub?.[DoorsNLocksSubsystem.ATTR_PETDOORDEVICES] as string[]) ?? [];
    const chimeConfig = (sub?.[DoorsNLocksSubsystem.ATTR_CHIMECONFIG] as Record<string, unknown>) ?? {};

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

/** Home & Family (Presence) subsystem state */
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

/** Care subsystem state */
export function useCareSubsystem() {
  const sub = useSubsystem('subcare');

  return useMemo(() => {
    const alarmState = (sub?.[CareSubsystem.ATTR_ALARMSTATE] as string) ?? CareSubsystem.ALARMSTATE_READY;
    const alarmMode = (sub?.[CareSubsystem.ATTR_ALARMMODE] as string) ?? CareSubsystem.ALARMMODE_ON;
    const behaviors = (sub?.[CareSubsystem.ATTR_BEHAVIORS] as Record<string, unknown>[]) ?? [];
    const careDevices = (sub?.[CareSubsystem.ATTR_CAREDEVICES] as string[]) ?? [];
    const callTree = (sub?.[CareSubsystem.ATTR_CALLTREE] as Record<string, unknown>[]) ?? [];
    const lastAlertCause = sub?.[CareSubsystem.ATTR_LASTALERTCAUSE] as string | undefined;
    const silent = (sub?.[CareSubsystem.ATTR_SILENT] as boolean) ?? false;

    return {
      subsystem: sub,
      alarmState,
      alarmMode,
      behaviors,
      careDevices,
      callTree,
      lastAlertCause,
      silent,
    };
  }, [sub]);
}

/** Cameras subsystem state */
export function useCamerasSubsystem() {
  const sub = useSubsystem('subcameras');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const cameraAddrs = (sub?.[CamerasSubsystem.ATTR_CAMERAS] as string[]) ?? [];
    const cameras = allDevices.filter((d) => cameraAddrs.includes(d[Base.ATTR_ADDRESS]));
    const maxStreams = (sub?.[CamerasSubsystem.ATTR_MAXSIMULTANEOUSSTREAMS] as number) ?? 4;

    return {
      subsystem: sub,
      cameras,
      maxStreams,
    };
  }, [sub, allDevices]);
}

/** Lawn & Garden subsystem state */
export function useLawnGardenSubsystem() {
  const sub = useSubsystem('sublawnngarden');
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    const controllerAddrs = (sub?.[LawnNGardenSubsystem.ATTR_CONTROLLERS] as string[]) ?? [];
    const controllers = allDevices.filter((d) => controllerAddrs.includes(d[Base.ATTR_ADDRESS]));
    const zonesWatering = (sub?.[LawnNGardenSubsystem.ATTR_ZONESWATERING] as Record<string, unknown>[]) ?? [];
    const nextEvent = sub?.[LawnNGardenSubsystem.ATTR_NEXTEVENT] as Record<string, unknown> | undefined;

    return {
      subsystem: sub,
      controllers,
      zonesWatering,
      nextEvent,
    };
  }, [sub, allDevices]);
}

/** Water subsystem state */
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

/** Lights & Switches subsystem state */
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
