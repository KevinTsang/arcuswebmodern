import { renderHook } from '@testing-library/react';
import { LawnNGardenSubsystem } from '@arcus/core';
import { useLawnGardenSubsystem } from '@/hooks/useLawnGardenSubsystem';
import type { SubsystemEntity, DeviceEntity, ZoneWateringEntry, LawnGardenEvent } from '@/store/entityTypes';
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

describe('useLawnGardenSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.controllers).toEqual([]);
      expect(result.current.zonesWatering).toEqual([]);
      expect(result.current.nextEvent).toBeUndefined();
    });
  });

  describe('controllers', () => {
    it('returns controller devices matching addresses from the subsystem', () => {
      const controller1 = makeDevice('DRIV:dev:ctrl1');
      const controller2 = makeDevice('DRIV:dev:ctrl2');
      const otherDevice = makeDevice('DRIV:dev:other');
      mockDevices = [controller1, controller2, otherDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc', {
        [LawnNGardenSubsystem.ATTR_CONTROLLERS]: ['DRIV:dev:ctrl1', 'DRIV:dev:ctrl2'],
      }));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.controllers).toEqual([controller1, controller2]);
    });

    it('returns empty array when subsystem has no controller addresses', () => {
      mockDevices = [makeDevice('DRIV:dev:ctrl1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc', {
        [LawnNGardenSubsystem.ATTR_CONTROLLERS]: [],
      }));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.controllers).toEqual([]);
    });

    it('returns empty array when controller addresses have no matching devices', () => {
      mockDevices = [makeDevice('DRIV:dev:other')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc', {
        [LawnNGardenSubsystem.ATTR_CONTROLLERS]: ['DRIV:dev:ctrl1'],
      }));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.controllers).toEqual([]);
    });
  });

  describe('zonesWatering', () => {
    it('returns zonesWatering from the subsystem', () => {
      const zones: ZoneWateringEntry[] = [
        { zoneName: 'Front Yard', zoneNumber: 1, duration: 15 },
        { zoneName: 'Back Yard', zoneNumber: 2, duration: 20 },
      ];
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc', {
        [LawnNGardenSubsystem.ATTR_ZONESWATERING]: zones,
      }));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.zonesWatering).toEqual(zones);
    });

    it('defaults zonesWatering to empty array when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc'));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.zonesWatering).toEqual([]);
    });
  });

  describe('nextEvent', () => {
    it('returns nextEvent from the subsystem', () => {
      const event: LawnGardenEvent = {
        zoneName: 'Front Yard',
        startTime: 1711900800000,
        duration: 30,
      };
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc', {
        [LawnNGardenSubsystem.ATTR_NEXTEVENT]: event,
      }));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.nextEvent).toEqual(event);
    });

    it('returns undefined for nextEvent when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:sublawnngarden:abc'));

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.nextEvent).toBeUndefined();
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:sublawnngarden:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useLawnGardenSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
