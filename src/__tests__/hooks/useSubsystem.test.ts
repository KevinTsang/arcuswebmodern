import { renderHook } from '@testing-library/react';
import {
  Alarm, AlarmSubsystem, Base, LightsNSwitchesSubsystem, SecuritySubsystem, WaterSubsystem,
} from '@arcus/core';
import { useSubsystemDevices } from '@/hooks/useSubsystem';
import type { DeviceEntity, SubsystemEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockSubsystems: SubsystemEntity[] = [];
let mockDevices: DeviceEntity[] = [];

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('@/store/slices/subsystemsSlice', () => ({
  selectAllSubsystems: () => mockSubsystems,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: () => mockDevices,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ALARM = `SERV:${AlarmSubsystem.NAMESPACE}:place-1`;
const SECURITY = `SERV:${SecuritySubsystem.NAMESPACE}:place-1`;
const LIGHTS = `SERV:${LightsNSwitchesSubsystem.NAMESPACE}:place-1`;
const WATER = `SERV:${WaterSubsystem.NAMESPACE}:place-1`;

const contact = makeDevice('DRIV:dev:contact');
const motion = makeDevice('DRIV:dev:motion');
const smoke = makeDevice('DRIV:dev:smoke');
const leak = makeDevice('DRIV:dev:leak');
const lamp = makeDevice('DRIV:dev:lamp');
const valve = makeDevice('DRIV:dev:valve');

function addresses(devices: DeviceEntity[]): string[] {
  return devices.map((d) => d[Base.ATTR_ADDRESS]).sort();
}

beforeEach(() => {
  mockSubsystems = [];
  mockDevices = [contact, motion, smoke, leak, lamp, valve];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useSubsystemDevices', () => {
  it('returns nothing when the subsystem is absent', () => {
    const { result } = renderHook(() => useSubsystemDevices(AlarmSubsystem.NAMESPACE));
    expect(result.current).toEqual([]);
  });

  describe('Alarms', () => {
    it('collects devices from the alarm subsystem\'s per-alert Alarm instances', () => {
      mockSubsystems = [
        makeSubsystem(ALARM, {
          [`${Alarm.ATTR_DEVICES}:SECURITY`]: [contact.id, motion.id],
          [`${Alarm.ATTR_DEVICES}:SMOKE`]: [smoke.id],
          [`${Alarm.ATTR_DEVICES}:WATER`]: [leak.id],
        }),
      ];
      const { result } = renderHook(() => useSubsystemDevices(AlarmSubsystem.NAMESPACE));
      expect(addresses(result.current)).toEqual([contact.id, leak.id, motion.id, smoke.id].sort());
    });

    it('lists a device once even when it can raise several alert types', () => {
      mockSubsystems = [
        makeSubsystem(ALARM, {
          [`${Alarm.ATTR_DEVICES}:SMOKE`]: [smoke.id],
          [`${Alarm.ATTR_DEVICES}:CO`]: [smoke.id],
        }),
      ];
      const { result } = renderHook(() => useSubsystemDevices(AlarmSubsystem.NAMESPACE));
      expect(addresses(result.current)).toEqual([smoke.id]);
    });

    it('does not read device lists that live on other subsystems', () => {
      // Regression: the config used to list subsecurity/subsafety attributes
      // under the subalarm namespace, which the alarm subsystem never has.
      mockSubsystems = [
        makeSubsystem(ALARM, {}),
        makeSubsystem(SECURITY, { [SecuritySubsystem.ATTR_SECURITYDEVICES]: [contact.id] }),
      ];
      const { result } = renderHook(() => useSubsystemDevices(AlarmSubsystem.NAMESPACE));
      expect(result.current).toEqual([]);
    });
  });

  it('collects Lights & Switches devices from switchDevices', () => {
    mockSubsystems = [
      makeSubsystem(LIGHTS, { [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: [lamp.id] }),
    ];
    const { result } = renderHook(() => useSubsystemDevices(LightsNSwitchesSubsystem.NAMESPACE));
    expect(addresses(result.current)).toEqual([lamp.id]);
  });

  it('collects Water devices from waterDevices', () => {
    mockSubsystems = [
      makeSubsystem(WATER, { [WaterSubsystem.ATTR_WATERDEVICES]: [leak.id, valve.id] }),
    ];
    const { result } = renderHook(() => useSubsystemDevices(WaterSubsystem.NAMESPACE));
    expect(addresses(result.current)).toEqual([leak.id, valve.id].sort());
  });

  it('ignores addresses that are not paired devices', () => {
    mockSubsystems = [
      makeSubsystem(WATER, { [WaterSubsystem.ATTR_WATERDEVICES]: ['DRIV:dev:gone', valve.id] }),
    ];
    const { result } = renderHook(() => useSubsystemDevices(WaterSubsystem.NAMESPACE));
    expect(addresses(result.current)).toEqual([valve.id]);
  });
});
