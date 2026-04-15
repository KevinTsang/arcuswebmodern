import { renderHook } from '@testing-library/react';
import { WaterSubsystem } from '@arcus/core';
import { useWaterSubsystem } from '@/hooks/useWaterSubsystem';
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

describe('useWaterSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.waterDevices).toEqual([]);
      expect(result.current.closedValveCount).toBe(0);
    });
  });

  describe('waterDevices', () => {
    it('returns water devices matching addresses from the subsystem', () => {
      const water1 = makeDevice('DRIV:dev:water1');
      const water2 = makeDevice('DRIV:dev:water2');
      const otherDevice = makeDevice('DRIV:dev:other');
      mockDevices = [water1, water2, otherDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_WATERDEVICES]: ['DRIV:dev:water1', 'DRIV:dev:water2'],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.waterDevices).toEqual([water1, water2]);
    });

    it('returns empty array when subsystem has no water device addresses', () => {
      mockDevices = [makeDevice('DRIV:dev:water1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_WATERDEVICES]: [],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.waterDevices).toEqual([]);
    });

    it('returns empty array when water device addresses have no matching devices', () => {
      mockDevices = [makeDevice('DRIV:dev:other')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_WATERDEVICES]: ['DRIV:dev:water1'],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.waterDevices).toEqual([]);
    });
  });

  describe('closedValveCount', () => {
    it('returns the count of closed water valves from address list length', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_CLOSEDWATERVALVES]: ['DRIV:dev:valve1', 'DRIV:dev:valve2', 'DRIV:dev:valve3'],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.closedValveCount).toBe(3);
    });

    it('returns zero when no closed water valve addresses exist', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_CLOSEDWATERVALVES]: [],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.closedValveCount).toBe(0);
    });

    it('returns zero when closed water valves attribute is absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc'));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.closedValveCount).toBe(0);
    });
  });

  describe('combined scenario', () => {
    it('returns correct values for a fully populated subsystem', () => {
      const water1 = makeDevice('DRIV:dev:water1');
      const water2 = makeDevice('DRIV:dev:water2');
      mockDevices = [water1, water2];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subwater:abc', {
        [WaterSubsystem.ATTR_WATERDEVICES]: ['DRIV:dev:water1', 'DRIV:dev:water2'],
        [WaterSubsystem.ATTR_CLOSEDWATERVALVES]: ['DRIV:dev:valve1'],
      }));

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.waterDevices).toEqual([water1, water2]);
      expect(result.current.closedValveCount).toBe(1);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:subwater:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useWaterSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
