import { renderHook } from '@testing-library/react';
import { PresenceSubsystem } from '@arcus/core';
import { useHomeFamilySubsystem } from '@/hooks/useHomeFamilySubsystem';
import type { SubsystemEntity, PersonEntity } from '@/store/entityTypes';
import { makePerson, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockUseSubsystem = jest.fn<SubsystemEntity | undefined, [string]>();
let mockPeople: PersonEntity[] = [];

jest.mock('@/hooks/useSubsystem', () => ({
  useSubsystem: (ns: string) => mockUseSubsystem(ns),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => mockPeople,
}));

jest.mock('@/store/slices/peopleSlice', () => ({
  selectAllPeople: jest.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockPeople = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useHomeFamilySubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.peopleAtHome).toEqual([]);
      expect(result.current.peopleAway).toEqual([]);
      expect(result.current.devicesAtHomeCount).toBe(0);
      expect(result.current.devicesAwayCount).toBe(0);
    });
  });

  describe('peopleAtHome', () => {
    it('returns people entities matching peopleAtHome addresses', () => {
      const person1 = makePerson('SERV:person:person1');
      const person2 = makePerson('SERV:person:person2');
      const personAway = makePerson('SERV:person:person3');
      mockPeople = [person1, person2, personAway];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_PEOPLEATHOME]: ['SERV:person:person1', 'SERV:person:person2'],
        [PresenceSubsystem.ATTR_PEOPLEAWAY]: ['SERV:person:person3'],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.peopleAtHome).toEqual([person1, person2]);
    });

    it('returns empty array when no people are at home', () => {
      mockPeople = [makePerson('SERV:person:person1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_PEOPLEATHOME]: [],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.peopleAtHome).toEqual([]);
    });
  });

  describe('peopleAway', () => {
    it('returns people entities matching peopleAway addresses', () => {
      const personAway = makePerson('SERV:person:person1');
      mockPeople = [personAway];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_PEOPLEAWAY]: ['SERV:person:person1'],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.peopleAway).toEqual([personAway]);
    });

    it('returns empty array when no people are away', () => {
      mockPeople = [makePerson('SERV:person:person1')];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_PEOPLEAWAY]: [],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.peopleAway).toEqual([]);
    });
  });

  describe('devicesAtHomeCount', () => {
    it('returns the count of devices at home from address list length', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_DEVICESATHOME]: ['DRIV:dev:dev1', 'DRIV:dev:dev2', 'DRIV:dev:dev3'],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.devicesAtHomeCount).toBe(3);
    });

    it('returns zero when no devices at home addresses exist', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_DEVICESATHOME]: [],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.devicesAtHomeCount).toBe(0);
    });
  });

  describe('devicesAwayCount', () => {
    it('returns the count of devices away from address list length', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_DEVICESAWAY]: ['DRIV:dev:dev1', 'DRIV:dev:dev2'],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.devicesAwayCount).toBe(2);
    });

    it('returns zero when no devices away addresses exist', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_DEVICESAWAY]: [],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.devicesAwayCount).toBe(0);
    });
  });

  describe('combined scenario', () => {
    it('returns correct values for a fully populated subsystem', () => {
      const person1 = makePerson('SERV:person:person1');
      const person2 = makePerson('SERV:person:person2');
      const person3 = makePerson('SERV:person:person3');
      mockPeople = [person1, person2, person3];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subspres:abc', {
        [PresenceSubsystem.ATTR_PEOPLEATHOME]: ['SERV:person:person1'],
        [PresenceSubsystem.ATTR_PEOPLEAWAY]: ['SERV:person:person2', 'SERV:person:person3'],
        [PresenceSubsystem.ATTR_DEVICESATHOME]: ['DRIV:dev:dev1'],
        [PresenceSubsystem.ATTR_DEVICESAWAY]: ['DRIV:dev:dev2', 'DRIV:dev:dev3'],
      }));

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.peopleAtHome).toEqual([person1]);
      expect(result.current.peopleAway).toEqual([person2, person3]);
      expect(result.current.devicesAtHomeCount).toBe(1);
      expect(result.current.devicesAwayCount).toBe(2);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:subspres:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useHomeFamilySubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
