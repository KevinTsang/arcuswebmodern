import { renderHook } from '@testing-library/react';
import {
  IrrigationController, IrrigationScheduleMode, LawnNGardenSubsystem,
} from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import type { DeviceEntity, SubsystemEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';
import { CONTROLLER, SUBSYSTEM, makeEvent } from '../helpers/irrigation';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: DeviceEntity | undefined;
let mockSubsystem: SubsystemEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: () => mockSubsystem,
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockDevice = makeDevice(CONTROLLER, {
    [IrrigationController.ATTR_NUMZONES]: 2,
    [IrrigationController.ATTR_CONTROLLERSTATE]: IrrigationController.CONTROLLERSTATE_NOT_WATERING,
  });
  mockSubsystem = makeSubsystem(SUBSYSTEM);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useIrrigationController', () => {
  it('returns defaults when the subsystem has no schedule data', () => {
    const { result } = renderHook(() => useIrrigationController(CONTROLLER));

    expect(result.current.subsystemAddress).toBe(SUBSYSTEM);
    expect(result.current.zones.map((z) => z.zone)).toEqual(['z1', 'z2']);
    expect(result.current.watering).toBe(false);
    expect(result.current.activeMode).toBeNull();
    expect(result.current.skippedUntil).toBeUndefined();
    expect(result.current.eventsByMode[IrrigationScheduleMode.WEEKLY]).toEqual([]);
    expect(result.current.intervalDays).toBe(1);
    expect(result.current.intervalConfigured).toBe(false);
  });

  it('handles a missing subsystem and device', () => {
    mockSubsystem = undefined;
    mockDevice = undefined;
    const { result } = renderHook(() => useIrrigationController(CONTROLLER));

    expect(result.current.subsystemAddress).toBeUndefined();
    expect(result.current.zones).toEqual([]);
    expect(result.current.device).toBeUndefined();
  });

  it('reads watering state, schedule status and schedules for the controller', () => {
    mockDevice = makeDevice(CONTROLLER, {
      [IrrigationController.ATTR_CONTROLLERSTATE]: IrrigationController.CONTROLLERSTATE_WATERING,
    });
    const weekly = makeEvent('w1', { days: ['MON'] });
    const even = makeEvent('e1');
    mockSubsystem = makeSubsystem(SUBSYSTEM, {
      [LawnNGardenSubsystem.ATTR_SCHEDULESTATUS]: {
        [CONTROLLER]: { mode: IrrigationScheduleMode.WEEKLY, enabled: true, skippedUntil: 1700000000000 },
      },
      [LawnNGardenSubsystem.ATTR_WEEKLYSCHEDULES]: { [CONTROLLER]: { events: [weekly] } },
      [LawnNGardenSubsystem.ATTR_EVENSCHEDULES]: { [CONTROLLER]: { events: [even] }, 'DRIV:dev:other': { events: [] } },
      [LawnNGardenSubsystem.ATTR_INTERVALSCHEDULES]: { [CONTROLLER]: { days: 3, events: [] } },
    });

    const { result } = renderHook(() => useIrrigationController(CONTROLLER));

    expect(result.current.watering).toBe(true);
    expect(result.current.activeMode).toBe(IrrigationScheduleMode.WEEKLY);
    expect(result.current.skippedUntil).toBe(1700000000000);
    expect(result.current.eventsByMode[IrrigationScheduleMode.WEEKLY]).toEqual([weekly]);
    expect(result.current.eventsByMode[IrrigationScheduleMode.EVEN]).toEqual([even]);
    expect(result.current.eventsByMode[IrrigationScheduleMode.ODD]).toEqual([]);
    expect(result.current.intervalDays).toBe(3);
    expect(result.current.intervalConfigured).toBe(true);
  });

  it('reports manual mode when scheduling is disabled', () => {
    mockSubsystem = makeSubsystem(SUBSYSTEM, {
      [LawnNGardenSubsystem.ATTR_SCHEDULESTATUS]: {
        [CONTROLLER]: { mode: IrrigationScheduleMode.ODD, enabled: false, skippedUntil: 0 },
      },
    });

    const { result } = renderHook(() => useIrrigationController(CONTROLLER));

    expect(result.current.activeMode).toBeNull();
    expect(result.current.skippedUntil).toBeUndefined();
  });
});
