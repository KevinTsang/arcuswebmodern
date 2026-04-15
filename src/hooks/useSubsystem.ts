/**
 * Base hooks for accessing subsystem data from Redux state.
 *
 * Domain-specific hooks (useAlarmSubsystem, useClimateSubsystem, etc.)
 * live in their own files alongside this one.
 */

import { useMemo } from 'react';
import { Base } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { type SubsystemConfigEntry, subsystemConfigs } from '@/lib/subsystemConfig';
import type { SubsystemEntity } from '@/store/entityTypes';

/**
 * Find a subsystem entity by its namespace prefix (e.g., 'subalarm').
 */
export function useSubsystem(namespace: string): SubsystemEntity | undefined {
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
  subsystem: SubsystemEntity | undefined;
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
