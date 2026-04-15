import { renderHook } from '@testing-library/react';
import { CamerasSubsystem } from '@arcus/core';
import { useCamerasSubsystem } from '@/hooks/useCamerasSubsystem';
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

describe('useCamerasSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.cameras).toEqual([]);
      expect(result.current.maxStreams).toBe(4);
    });
  });

  describe('cameras', () => {
    it('returns camera devices matching addresses from the subsystem', () => {
      const cam1 = makeDevice('DRIV:dev:cam1');
      const cam2 = makeDevice('DRIV:dev:cam2');
      const otherDevice = makeDevice('DRIV:dev:other');
      mockDevices = [cam1, cam2, otherDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc', {
        [CamerasSubsystem.ATTR_CAMERAS]: ['DRIV:dev:cam1', 'DRIV:dev:cam2'],
      }));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.cameras).toEqual([cam1, cam2]);
    });

    it('returns empty array when subsystem has no camera addresses', () => {
      mockDevices = [makeDevice('DRIV:dev:cam1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc', {
        [CamerasSubsystem.ATTR_CAMERAS]: [],
      }));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.cameras).toEqual([]);
    });

    it('returns empty array when camera addresses have no matching devices', () => {
      mockDevices = [makeDevice('DRIV:dev:other')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc', {
        [CamerasSubsystem.ATTR_CAMERAS]: ['DRIV:dev:cam1'],
      }));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.cameras).toEqual([]);
    });
  });

  describe('maxStreams', () => {
    it('returns maxSimultaneousStreams from the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc', {
        [CamerasSubsystem.ATTR_MAXSIMULTANEOUSSTREAMS]: 8,
      }));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.maxStreams).toBe(8);
    });

    it('defaults maxStreams to 4 when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc'));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.maxStreams).toBe(4);
    });

    it('returns maxStreams of 1 when set to 1', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subcameras:abc', {
        [CamerasSubsystem.ATTR_MAXSIMULTANEOUSSTREAMS]: 1,
      }));

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.maxStreams).toBe(1);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:subcameras:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useCamerasSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
