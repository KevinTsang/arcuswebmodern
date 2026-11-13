/**
 * Test fixtures for irrigation components, which read their controller
 * through `useIrrigationController`.
 */

import { Base, Device, IrrigationScheduleMode } from '@arcus/core';
import type { IrrigationControllerState } from '@/hooks/useIrrigationController';
import type { IrrigationScheduleEvent, IrrigationZoneInfo } from '@/lib/irrigation';

export const CONTROLLER = 'DRIV:dev:sprinkler';
export const SUBSYSTEM = 'SERV:sublawnngarden:place-1';

export function makeZone(num: number, overrides: Partial<IrrigationZoneInfo> = {}): IrrigationZoneInfo {
  return {
    zone: `z${num}`,
    zoneNum: num,
    name: `Zone ${num}`,
    watering: false,
    defaultDuration: 10,
    wateringDuration: 0,
    ...overrides,
  };
}

export function makeEvent(eventId: string, overrides: Partial<IrrigationScheduleEvent> = {}): IrrigationScheduleEvent {
  return {
    eventId,
    timeOfDay: '06:00:00',
    events: [{ zone: 'z1', duration: 10 }],
    ...overrides,
  };
}

export function makeIrrigationState(overrides: Partial<IrrigationControllerState> = {}): IrrigationControllerState {
  return {
    device: { id: CONTROLLER, [Base.ATTR_ADDRESS]: CONTROLLER, [Device.ATTR_NAME]: 'Backyard Sprinklers' },
    subsystemAddress: SUBSYSTEM,
    zones: [makeZone(1, { name: 'Front Lawn' }), makeZone(2, { name: 'Back Lawn' })],
    watering: false,
    scheduleStatus: undefined,
    activeMode: null,
    skippedUntil: undefined,
    eventsByMode: {
      [IrrigationScheduleMode.WEEKLY]: [],
      [IrrigationScheduleMode.INTERVAL]: [],
      [IrrigationScheduleMode.EVEN]: [],
      [IrrigationScheduleMode.ODD]: [],
    },
    intervalDays: 1,
    intervalConfigured: false,
    ...overrides,
  };
}
