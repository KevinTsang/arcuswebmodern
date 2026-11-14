import { renderHook } from '@testing-library/react';
import { Base, ClimateSubsystem, Scheduler } from '@arcus/core';
import { useThermostatScheduleStatus } from '@/hooks/useThermostatScheduleStatus';
import { makeSubsystem } from '../helpers/factories';
import type { SchedulerEntity, SubsystemEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const THERM = 'DRIV:dev:therm-1';
let mockClimate: SubsystemEntity | undefined;
let mockScheduler: SchedulerEntity | undefined;

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: () => mockClimate,
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: object) => unknown) => selector({}),
}));

jest.mock('@/store/slices/schedulersSlice', () => ({
  selectSchedulerByTarget: () => mockScheduler,
}));

beforeEach(() => {
  mockClimate = makeSubsystem('SERV:subclimate:p', {
    [ClimateSubsystem.ATTR_THERMOSTATSCHEDULES]: {
      [THERM]: { thermostat: THERM, scheduler: 'SERV:scheduler:s1', enabled: true },
    },
  });
  mockScheduler = {
    id: 'SERV:scheduler:s1',
    [Base.ATTR_ADDRESS]: 'SERV:scheduler:s1',
    [Scheduler.ATTR_TARGET]: THERM,
    [Scheduler.ATTR_COMMANDS]: { a: {}, b: {} },
  };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useThermostatScheduleStatus', () => {
  it('reports whether the schedule is followed and its event count', () => {
    const { result } = renderHook(() => useThermostatScheduleStatus(THERM));
    expect(result.current).toEqual({ enabled: true, eventCount: 2 });
  });

  it('reports a disabled schedule', () => {
    mockClimate = makeSubsystem('SERV:subclimate:p', {
      [ClimateSubsystem.ATTR_THERMOSTATSCHEDULES]: { [THERM]: { enabled: false } },
    });
    const { result } = renderHook(() => useThermostatScheduleStatus(THERM));
    expect(result.current.enabled).toBe(false);
  });

  it('treats missing data as no schedule', () => {
    mockClimate = undefined;
    mockScheduler = undefined;
    const { result } = renderHook(() => useThermostatScheduleStatus(THERM));
    expect(result.current).toEqual({ enabled: false, eventCount: 0 });
  });

  it('ignores other thermostats', () => {
    const { result } = renderHook(() => useThermostatScheduleStatus('DRIV:dev:other'));
    expect(result.current.enabled).toBe(false);
  });
});
