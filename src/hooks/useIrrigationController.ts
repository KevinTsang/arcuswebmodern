import { useMemo } from 'react';
import {
  Base, IrrigationController, IrrigationScheduleMode, LawnNGardenSubsystem, type IrrigationScheduleModeValue,
} from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useSubsystem } from '@/hooks/useSubsystem';
import {
  SCHEDULE_ATTR_BY_MODE,
  SCHEDULE_MODES,
  getIrrigationZones,
  type IrrigationSchedule,
  type IrrigationScheduleEvent,
  type IrrigationScheduleStatus,
  type IrrigationZoneInfo,
} from '@/lib/irrigation';
import type { DeviceEntity } from '@/store/entityTypes';

export interface IrrigationControllerState {
  device: DeviceEntity | undefined;
  /** Address of the lawn & garden subsystem that schedule commands go to. */
  subsystemAddress: string | undefined;
  zones: IrrigationZoneInfo[];
  watering: boolean;
  scheduleStatus: IrrigationScheduleStatus | undefined;
  /** The active schedule mode, or `null` when watering is manual (scheduling disabled). */
  activeMode: IrrigationScheduleModeValue | null;
  skippedUntil: number | undefined;
  eventsByMode: Record<IrrigationScheduleModeValue, IrrigationScheduleEvent[]>;
  /** Interval mode: water every N days (defaults to 1 when not configured). */
  intervalDays: number;
  /** Whether an interval schedule has been configured (has a day count). */
  intervalConfigured: boolean;
}

type ScheduleMap = Record<string, IrrigationSchedule>;
type StatusMap = Record<string, IrrigationScheduleStatus>;

/**
 * Everything the irrigation UI needs about one controller: its zones, its
 * watering state, and its schedules from the lawn & garden subsystem.
 */
export function useIrrigationController(address: string): IrrigationControllerState {
  const device = useDevice(address);
  const sub = useSubsystem(LawnNGardenSubsystem.NAMESPACE);

  return useMemo(() => {
    const statusMap = sub?.[LawnNGardenSubsystem.ATTR_SCHEDULESTATUS] as StatusMap | undefined;
    const scheduleStatus = statusMap?.[address];
    const schedule = (mode: IrrigationScheduleModeValue) =>
      (sub?.[SCHEDULE_ATTR_BY_MODE[mode]] as ScheduleMap | undefined)?.[address];

    const eventsByMode = Object.fromEntries(
      SCHEDULE_MODES.map((mode) => [mode, schedule(mode)?.events ?? []]),
    ) as Record<IrrigationScheduleModeValue, IrrigationScheduleEvent[]>;

    const intervalSchedule = schedule(IrrigationScheduleMode.INTERVAL);

    return {
      device,
      subsystemAddress: sub?.[Base.ATTR_ADDRESS],
      zones: getIrrigationZones(device),
      watering: device?.[IrrigationController.ATTR_CONTROLLERSTATE] === IrrigationController.CONTROLLERSTATE_WATERING,
      scheduleStatus,
      activeMode: scheduleStatus?.enabled && scheduleStatus.mode ? scheduleStatus.mode : null,
      skippedUntil: scheduleStatus?.skippedUntil || undefined,
      eventsByMode,
      intervalDays: intervalSchedule?.days ?? 1,
      intervalConfigured: !!intervalSchedule?.days,
    };
  }, [device, sub, address]);
}
