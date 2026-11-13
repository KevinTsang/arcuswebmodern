import { CareSubsystem } from '@arcus/core';
import type { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { makeSubsystem } from './factories';

/** The value `useCareSubsystem()` returns, for tests that mock the hook. */
export type CareState = ReturnType<typeof useCareSubsystem>;

export const CARE_ADDR = 'SERV:subcare:place-1';

/** A care subsystem in the READY state, alarm ON, with one active and one disabled behavior. */
export function makeCareState(overrides: Partial<CareState> = {}): CareState {
  return {
    subsystem: makeSubsystem(CARE_ADDR),
    alarmState: CareSubsystem.ALARMSTATE_READY,
    alarmMode: CareSubsystem.ALARMMODE_ON,
    behaviors: [
      { name: 'Morning activity', enabled: true },
      { name: 'Night wandering', enabled: false },
    ],
    careDevices: [],
    careCapableDevices: [],
    callTree: [],
    lastAlertCause: undefined,
    silent: false,
    ...overrides,
  };
}
