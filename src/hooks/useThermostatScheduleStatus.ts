import { useMemo } from 'react';
import { ClimateSubsystem, Scheduler } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectSchedulerByTarget } from '@/store/slices/schedulersSlice';
import { useSubsystem } from './useSubsystem';

/** One entry of `subclimate:thermostatSchedules`, keyed by thermostat address. */
export interface ThermostatScheduleEntry {
  thermostat?: string;
  scheduler?: string;
  enabled?: boolean;
}

export interface ThermostatScheduleStatus {
  /** Whether the climate subsystem follows this thermostat's schedule. */
  enabled: boolean;
  /** Number of events across all of the thermostat's HVAC mode programs. */
  eventCount: number;
}

/**
 * Schedule status for a thermostat: whether it follows its schedule
 * (from the climate subsystem) and how many events it has (from its scheduler).
 */
export function useThermostatScheduleStatus(address: string): ThermostatScheduleStatus {
  const climate = useSubsystem('subclimate');
  const scheduler = useAppSelector((s) => selectSchedulerByTarget(s, address));

  return useMemo(() => {
    const schedules = climate?.[ClimateSubsystem.ATTR_THERMOSTATSCHEDULES] as
      | { [thermostat: string]: ThermostatScheduleEntry }
      | undefined;
    const commands = scheduler?.[Scheduler.ATTR_COMMANDS] as { [id: string]: object } | undefined;
    return {
      enabled: schedules?.[address]?.enabled === true,
      eventCount: commands ? Object.keys(commands).length : 0,
    };
  }, [climate, scheduler, address]);
}
