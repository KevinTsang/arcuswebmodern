/**
 * Hooks for accessing subsystem data from Redux state.
 *
 * Provides typed access to subsystem attributes, device lists,
 * and status information.
 */

import { useMemo } from 'react';
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
      const addr = s['base:address'] as string;
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
          const addr = s['base:address'] as string;
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
    return allDevices.filter((d) => addresses.has(d['base:address']));
  }, [subsystem, deviceAttributes, allDevices]);
}

// ── Subsystem-Specific Hooks ──────────────────────────────────────────

/** Alarm subsystem state */
export function useAlarmSubsystem() {
  const security = useSubsystem('subsecurity');
  const safety = useSubsystem('subsafety');
  const alarm = useSubsystem('subalarm');

  return useMemo(() => {
    const securityMode = (security?.['subsecurity:alarmMode'] as string) ?? 'OFF';
    const securityState = (security?.['subsecurity:alarmState'] as string) ?? 'DISARMED';
    const currentIncident = security?.['subsecurity:currentIncident'] as string | undefined;
    const securityDevices = (security?.['subsecurity:securityDevices'] as string[]) ?? [];
    const triggeredDevices = (security?.['subsecurity:triggeredDevices'] as string[]) ?? [];
    const offlineDevices = (security?.['subsecurity:offlineDevices'] as string[]) ?? [];
    const recordOnSecurity = (alarm?.['subalarm:recordOnSecurity'] as boolean) ?? false;
    const fanShutoffOnSmoke = (alarm?.['subalarm:fanShutoffOnSmoke'] as boolean) ?? false;
    const fanShutoffOnCO = (alarm?.['subalarm:fanShutoffOnCO'] as boolean) ?? false;

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
    const primaryTempDevice = sub?.['subclimate:primaryTemperatureDevice'] as string | undefined;
    const primaryHumidDevice = sub?.['subclimate:primaryHumidityDevice'] as string | undefined;
    const tempDeviceAddrs = (sub?.['subclimate:temperatureDevices'] as string[]) ?? [];
    const humidDeviceAddrs = (sub?.['subclimate:humidityDevices'] as string[]) ?? [];
    const controlDeviceAddrs = (sub?.['subclimate:controlDevices'] as string[]) ?? [];

    const controlDevices = allDevices.filter((d) => controlDeviceAddrs.includes(d['base:address']));
    const tempDevices = allDevices.filter((d) => tempDeviceAddrs.includes(d['base:address']));
    const humidDevices = allDevices.filter((d) => humidDeviceAddrs.includes(d['base:address']));

    // Get primary readings
    const primaryTempEntity = primaryTempDevice
      ? allDevices.find((d) => d['base:address'] === primaryTempDevice)
      : tempDevices[0];
    const primaryHumidEntity = primaryHumidDevice
      ? allDevices.find((d) => d['base:address'] === primaryHumidDevice)
      : humidDevices[0];

    const temperature = primaryTempEntity?.['temp:temperature'] as number | undefined;
    const humidity = primaryHumidEntity?.['humid:humidity'] as number | undefined;

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
    const lockAddrs = (sub?.['subdoorsnlocks:lockDevices'] as string[]) ?? [];
    const motorizedAddrs = (sub?.['subdoorsnlocks:motorizedDoorDevices'] as string[]) ?? [];
    const contactAddrs = (sub?.['subdoorsnlocks:contactSensorDevices'] as string[]) ?? [];
    const petDoorAddrs = (sub?.['subdoorsnlocks:petDoorDevices'] as string[]) ?? [];
    const chimeConfig = (sub?.['subdoorsnlocks:chimeConfig'] as Record<string, unknown>) ?? {};

    const locks = allDevices.filter((d) => lockAddrs.includes(d['base:address']));
    const motorized = allDevices.filter((d) => motorizedAddrs.includes(d['base:address']));
    const contacts = allDevices.filter((d) => contactAddrs.includes(d['base:address']));
    const petDoors = allDevices.filter((d) => petDoorAddrs.includes(d['base:address']));

    const unlockedCount = locks.filter((d) => d['doorlock:lockstate'] === 'UNLOCKED').length;
    const openCount = contacts.filter((d) => d['cont:contact'] === 'OPENED').length
      + motorized.filter((d) => (d['motdoor:doorstate'] as string) !== 'CLOSED').length;

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
    const peopleAtHomeAddrs = (sub?.['subspres:peopleAtHome'] as string[]) ?? [];
    const peopleAwayAddrs = (sub?.['subspres:peopleAway'] as string[]) ?? [];
    const devicesAtHomeAddrs = (sub?.['subspres:devicesAtHome'] as string[]) ?? [];
    const devicesAwayAddrs = (sub?.['subspres:devicesAway'] as string[]) ?? [];

    const peopleAtHome = people.filter((p) => peopleAtHomeAddrs.includes(p['base:address']));
    const peopleAway = people.filter((p) => peopleAwayAddrs.includes(p['base:address']));

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
    const alarmState = (sub?.['subcare:alarmState'] as string) ?? 'READY';
    const alarmMode = (sub?.['subcare:alarmMode'] as string) ?? 'ON';
    const behaviors = (sub?.['subcare:behaviors'] as Record<string, unknown>[]) ?? [];
    const careDevices = (sub?.['subcare:careDevices'] as string[]) ?? [];
    const callTree = (sub?.['subcare:callTree'] as Record<string, unknown>[]) ?? [];
    const lastAlertCause = sub?.['subcare:lastAlertCause'] as string | undefined;
    const silent = (sub?.['subcare:silent'] as boolean) ?? false;

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
    const cameraAddrs = (sub?.['subcameras:cameras'] as string[]) ?? [];
    const cameras = allDevices.filter((d) => cameraAddrs.includes(d['base:address']));
    const maxStreams = (sub?.['subcameras:maxSimultaneousStreams'] as number) ?? 4;

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
    const controllerAddrs = (sub?.['sublawnngarden:controllers'] as string[]) ?? [];
    const controllers = allDevices.filter((d) => controllerAddrs.includes(d['base:address']));
    const zonesWatering = (sub?.['sublawnngarden:zonesWatering'] as Record<string, unknown>[]) ?? [];
    const nextEvent = sub?.['sublawnngarden:nextEvent'] as Record<string, unknown> | undefined;

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
    const waterAddrs = (sub?.['subwater:waterDevices'] as string[]) ?? [];
    const closedValveAddrs = (sub?.['subwater:closedWaterValves'] as string[]) ?? [];
    const waterDevices = allDevices.filter((d) => waterAddrs.includes(d['base:address']));

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
    const switchAddrs = (sub?.['sublightsnswitches:switchDevices'] as string[]) ?? [];
    const devices = allDevices.filter((d) => switchAddrs.includes(d['base:address']));
    const onCount = devices.filter((d) => d['swit:state'] === 'ON').length;

    return {
      subsystem: sub,
      devices,
      onCount,
      totalCount: devices.length,
    };
  }, [sub, allDevices]);
}
