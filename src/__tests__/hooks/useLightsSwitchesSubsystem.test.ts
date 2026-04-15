import { renderHook } from '@testing-library/react';
import { Switch, LightsNSwitchesSubsystem } from '@arcus/core';
import { useLightsSwitchesSubsystem } from '@/hooks/useLightsSwitchesSubsystem';
import type { SubsystemEntity, DeviceEntity } from '@/store/entityTypes';
import { makeDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();
let mockDevices: DeviceEntity[] = [];

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockDevices,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useLightsSwitchesSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.devices).toEqual([]);
      expect(result.current.onCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('devices', () => {
    it('returns switch devices matching addresses from the subsystem', () => {
      const switch1 = makeDevice('DRIV:dev:switch1');
      const switch2 = makeDevice('DRIV:dev:switch2');
      const otherDevice = makeDevice('DRIV:dev:other');
      mockDevices = [switch1, switch2, otherDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1', 'DRIV:dev:switch2'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.devices).toEqual([switch1, switch2]);
    });

    it('returns empty array when subsystem has no switch device addresses', () => {
      mockDevices = [makeDevice('DRIV:dev:switch1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: [],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.devices).toEqual([]);
    });

    it('returns empty array when switch device addresses have no matching devices', () => {
      mockDevices = [makeDevice('DRIV:dev:other')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.devices).toEqual([]);
    });
  });

  describe('onCount', () => {
    it('counts devices with ON state', () => {
      const onDevice1 = makeDevice('DRIV:dev:switch1', {
        [Switch.ATTR_STATE]: Switch.STATE_ON,
      });
      const onDevice2 = makeDevice('DRIV:dev:switch2', {
        [Switch.ATTR_STATE]: Switch.STATE_ON,
      });
      const offDevice = makeDevice('DRIV:dev:switch3', {
        [Switch.ATTR_STATE]: Switch.STATE_OFF,
      });
      mockDevices = [onDevice1, onDevice2, offDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1', 'DRIV:dev:switch2', 'DRIV:dev:switch3'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.onCount).toBe(2);
    });

    it('returns zero when all devices are off', () => {
      const offDevice1 = makeDevice('DRIV:dev:switch1', {
        [Switch.ATTR_STATE]: Switch.STATE_OFF,
      });
      const offDevice2 = makeDevice('DRIV:dev:switch2', {
        [Switch.ATTR_STATE]: Switch.STATE_OFF,
      });
      mockDevices = [offDevice1, offDevice2];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1', 'DRIV:dev:switch2'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.onCount).toBe(0);
    });

    it('returns zero when no devices exist', () => {
      mockDevices = [];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: [],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.onCount).toBe(0);
    });
  });

  describe('totalCount', () => {
    it('returns the total number of matched devices', () => {
      const switch1 = makeDevice('DRIV:dev:switch1', {
        [Switch.ATTR_STATE]: Switch.STATE_ON,
      });
      const switch2 = makeDevice('DRIV:dev:switch2', {
        [Switch.ATTR_STATE]: Switch.STATE_OFF,
      });
      const switch3 = makeDevice('DRIV:dev:switch3', {
        [Switch.ATTR_STATE]: Switch.STATE_ON,
      });
      mockDevices = [switch1, switch2, switch3];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1', 'DRIV:dev:switch2', 'DRIV:dev:switch3'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.totalCount).toBe(3);
    });

    it('returns zero when no devices match', () => {
      mockDevices = [];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.totalCount).toBe(0);
    });
  });

  describe('combined scenario', () => {
    it('returns correct onCount and totalCount together', () => {
      const onSwitch = makeDevice('DRIV:dev:switch1', {
        [Switch.ATTR_STATE]: Switch.STATE_ON,
      });
      const offSwitch = makeDevice('DRIV:dev:switch2', {
        [Switch.ATTR_STATE]: Switch.STATE_OFF,
      });
      mockDevices = [onSwitch, offSwitch];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublightsnswitches:abc', {
        [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES]: ['DRIV:dev:switch1', 'DRIV:dev:switch2'],
      }));

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.onCount).toBe(1);
      expect(result.current.totalCount).toBe(2);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:sublightsnswitches:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useLightsSwitchesSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
