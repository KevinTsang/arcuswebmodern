import { renderHook } from '@testing-library/react';
import { CareSubsystem } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import type { SubsystemEntity, CareBehavior, CareCallEntry } from '@/store/entityTypes';
import { makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const CARE_ADDR = 'SERV:subcare:abc';

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useCareSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.alarmState).toBe(CareSubsystem.ALARMSTATE_READY);
      expect(result.current.alarmMode).toBe(CareSubsystem.ALARMMODE_ON);
      expect(result.current.behaviors).toEqual([]);
      expect(result.current.careDevices).toEqual([]);
      expect(result.current.callTree).toEqual([]);
      expect(result.current.lastAlertCause).toBeUndefined();
      expect(result.current.silent).toBe(false);
    });
  });

  describe('alarmState', () => {
    it('returns alarmState from the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_ALARMSTATE]: CareSubsystem.ALARMSTATE_ALERT,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.alarmState).toBe(CareSubsystem.ALARMSTATE_ALERT);
    });

    it('defaults alarmState to READY when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.alarmState).toBe(CareSubsystem.ALARMSTATE_READY);
    });
  });

  describe('alarmMode', () => {
    it('returns alarmMode from the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_ALARMMODE]: CareSubsystem.ALARMMODE_VISIT,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.alarmMode).toBe(CareSubsystem.ALARMMODE_VISIT);
    });

    it('defaults alarmMode to ON when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.alarmMode).toBe(CareSubsystem.ALARMMODE_ON);
    });
  });

  describe('behaviors', () => {
    it('returns behaviors from the subsystem', () => {
      const behaviors: CareBehavior[] = [
        { name: 'Inactivity', description: 'No motion detected', enabled: true, type: 'INACTIVITY' },
        { name: 'Open count', description: 'Door opened too many times', enabled: false, type: 'OPEN_COUNT' },
      ];
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_BEHAVIORS]: behaviors,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.behaviors).toEqual(behaviors);
    });

    it('defaults behaviors to empty array when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.behaviors).toEqual([]);
    });
  });

  describe('careDevices', () => {
    it('returns careDevices address list from the subsystem', () => {
      const careDevices = ['DRIV:dev:device1', 'DRIV:dev:device2'];
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_CAREDEVICES]: careDevices,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.careDevices).toEqual(careDevices);
    });

    it('defaults careDevices to empty array when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.careDevices).toEqual([]);
    });
  });

  describe('callTree', () => {
    it('returns callTree from the subsystem', () => {
      const callTree: CareCallEntry[] = [
        { person: 'SERV:person:person1', enabled: true },
        { person: 'SERV:person:person2', enabled: false },
      ];
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_CALLTREE]: callTree,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.callTree).toEqual(callTree);
    });

    it('defaults callTree to empty array when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.callTree).toEqual([]);
    });
  });

  describe('lastAlertCause', () => {
    it('returns lastAlertCause from the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_LASTALERTCAUSE]: 'BEHAVIOR_INACTIVITY',
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.lastAlertCause).toBe('BEHAVIOR_INACTIVITY');
    });

    it('returns undefined for lastAlertCause when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.lastAlertCause).toBeUndefined();
    });
  });

  describe('silent', () => {
    it('returns silent as true when set in the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_SILENT]: true,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.silent).toBe(true);
    });

    it('returns silent as false when set in the subsystem', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR, {
        [CareSubsystem.ATTR_SILENT]: false,
      }));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.silent).toBe(false);
    });

    it('defaults silent to false when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem(CARE_ADDR));

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.silent).toBe(false);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem(CARE_ADDR);
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useCareSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
