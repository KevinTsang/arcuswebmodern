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
import {
  type SubsystemConfigEntry,
  type SubsystemNamespace,
  getSubsystemConfigByNamespace,
  subsystemConfigs,
} from '@/lib/subsystemConfig';
import type { SubsystemEntity } from '@/store/entityTypes';

/**
 * Find a subsystem entity by its namespace prefix (e.g., 'subalarm').
 */
export function useSubsystem(namespace: SubsystemNamespace): SubsystemEntity | undefined {
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
 * Get the device entities a subsystem owns. Which subsystem attributes hold
 * the device address lists comes from `subsystemConfig`, so callers only name
 * the subsystem and cannot pass the wrong kind of attribute.
 */
export function useSubsystemDevices(namespace: SubsystemNamespace) {
  const subsystem = useSubsystem(namespace);
  const allDevices = useAppSelector(selectAllDevices);

  return useMemo(() => {
    if (!subsystem) return [];
    const deviceAttributes = getSubsystemConfigByNamespace(namespace)?.deviceAttributes ?? [];
    const addresses = new Set<string>();
    for (const attr of deviceAttributes) {
      const list = subsystem[attr] as string[] | undefined;
      if (list) {
        for (const addr of list) addresses.add(addr);
      }
    }
    return allDevices.filter((d) => addresses.has(d[Base.ATTR_ADDRESS]));
  }, [subsystem, namespace, allDevices]);
}
