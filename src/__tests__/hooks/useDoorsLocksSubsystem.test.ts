import { renderHook } from '@testing-library/react';
import { DoorLock, Contact, MotorizedDoor, DoorsNLocksSubsystem } from '@arcus/core';
import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import type { SubsystemEntity, DeviceEntity, ChimeConfig } from '@/store/entityTypes';
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

describe('useDoorsLocksSubsystem', () => {
  describe('defaults when subsystem is undefined', () => {
    it('returns default values when subsystem is undefined', () => {
      mockUseSubsystem.mockReturnValue(undefined);

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.subsystem).toBeUndefined();
      expect(result.current.locks).toEqual([]);
      expect(result.current.motorized).toEqual([]);
      expect(result.current.contacts).toEqual([]);
      expect(result.current.petDoors).toEqual([]);
      expect(result.current.chimeConfig).toEqual({});
      expect(result.current.unlockedCount).toBe(0);
      expect(result.current.openCount).toBe(0);
      expect(result.current.totalDevices).toBe(0);
    });
  });

  describe('locks', () => {
    it('returns lock devices matching addresses from the subsystem', () => {
      const lock1 = makeDevice('DRIV:dev:lock1');
      const lock2 = makeDevice('DRIV:dev:lock2');
      const otherDevice = makeDevice('DRIV:dev:other');
      mockDevices = [lock1, lock2, otherDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_LOCKDEVICES]: ['DRIV:dev:lock1', 'DRIV:dev:lock2'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.locks).toEqual([lock1, lock2]);
    });
  });

  describe('motorized doors', () => {
    it('returns motorized door devices matching addresses from the subsystem', () => {
      const motor1 = makeDevice('DRIV:dev:motor1');
      mockDevices = [motor1];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: ['DRIV:dev:motor1'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.motorized).toEqual([motor1]);
    });
  });

  describe('contact sensors', () => {
    it('returns contact sensor devices matching addresses from the subsystem', () => {
      const contact1 = makeDevice('DRIV:dev:contact1');
      const contact2 = makeDevice('DRIV:dev:contact2');
      mockDevices = [contact1, contact2];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES]: ['DRIV:dev:contact1', 'DRIV:dev:contact2'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.contacts).toEqual([contact1, contact2]);
    });
  });

  describe('pet doors', () => {
    it('returns pet door devices matching addresses from the subsystem', () => {
      const petDoor1 = makeDevice('DRIV:dev:petdoor1');
      mockDevices = [petDoor1];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_PETDOORDEVICES]: ['DRIV:dev:petdoor1'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.petDoors).toEqual([petDoor1]);
    });
  });

  describe('chimeConfig', () => {
    it('returns chimeConfig from the subsystem', () => {
      const chime: ChimeConfig = { 'DRIV:dev:lock1': true, 'DRIV:dev:lock2': false };
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: chime,
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.chimeConfig).toEqual(chime);
    });

    it('defaults chimeConfig to empty object when absent', () => {
      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc'));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.chimeConfig).toEqual({});
    });
  });

  describe('unlockedCount', () => {
    it('counts locks with UNLOCKED state', () => {
      const lockedDevice = makeDevice('DRIV:dev:lock1', {
        [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED,
      });
      const unlockedDevice1 = makeDevice('DRIV:dev:lock2', {
        [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_UNLOCKED,
      });
      const unlockedDevice2 = makeDevice('DRIV:dev:lock3', {
        [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_UNLOCKED,
      });
      mockDevices = [lockedDevice, unlockedDevice1, unlockedDevice2];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_LOCKDEVICES]: ['DRIV:dev:lock1', 'DRIV:dev:lock2', 'DRIV:dev:lock3'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.unlockedCount).toBe(2);
    });

    it('returns zero when all locks are locked', () => {
      const lockedDevice = makeDevice('DRIV:dev:lock1', {
        [DoorLock.ATTR_LOCKSTATE]: DoorLock.LOCKSTATE_LOCKED,
      });
      mockDevices = [lockedDevice];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_LOCKDEVICES]: ['DRIV:dev:lock1'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.unlockedCount).toBe(0);
    });
  });

  describe('openCount', () => {
    it('counts opened contacts', () => {
      const openContact = makeDevice('DRIV:dev:contact1', {
        [Contact.ATTR_CONTACT]: Contact.CONTACT_OPENED,
      });
      const closedContact = makeDevice('DRIV:dev:contact2', {
        [Contact.ATTR_CONTACT]: Contact.CONTACT_CLOSED,
      });
      mockDevices = [openContact, closedContact];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES]: ['DRIV:dev:contact1', 'DRIV:dev:contact2'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.openCount).toBe(1);
    });

    it('counts non-closed motorized doors as open', () => {
      const openMotor = makeDevice('DRIV:dev:motor1', {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN,
      });
      const closedMotor = makeDevice('DRIV:dev:motor2', {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_CLOSED,
      });
      const openingMotor = makeDevice('DRIV:dev:motor3', {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPENING,
      });
      mockDevices = [openMotor, closedMotor, openingMotor];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: ['DRIV:dev:motor1', 'DRIV:dev:motor2', 'DRIV:dev:motor3'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.openCount).toBe(2);
    });

    it('sums open contacts and non-closed motorized doors', () => {
      const openContact = makeDevice('DRIV:dev:contact1', {
        [Contact.ATTR_CONTACT]: Contact.CONTACT_OPENED,
      });
      const openMotor = makeDevice('DRIV:dev:motor1', {
        [MotorizedDoor.ATTR_DOORSTATE]: MotorizedDoor.DOORSTATE_OPEN,
      });
      mockDevices = [openContact, openMotor];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES]: ['DRIV:dev:contact1'],
        [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: ['DRIV:dev:motor1'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.openCount).toBe(2);
    });
  });

  describe('totalDevices', () => {
    it('sums locks, motorized, contacts, and petDoors', () => {
      const lock = makeDevice('DRIV:dev:lock1');
      const motor = makeDevice('DRIV:dev:motor1');
      const contact1 = makeDevice('DRIV:dev:contact1');
      const contact2 = makeDevice('DRIV:dev:contact2');
      const petDoor = makeDevice('DRIV:dev:petdoor1');
      mockDevices = [lock, motor, contact1, contact2, petDoor];

      mockUseSubsystem.mockReturnValue(makeSubsystem('SERV:subdoorsnlocks:abc', {
        [DoorsNLocksSubsystem.ATTR_LOCKDEVICES]: ['DRIV:dev:lock1'],
        [DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES]: ['DRIV:dev:motor1'],
        [DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES]: ['DRIV:dev:contact1', 'DRIV:dev:contact2'],
        [DoorsNLocksSubsystem.ATTR_PETDOORDEVICES]: ['DRIV:dev:petdoor1'],
      }));

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.totalDevices).toBe(5);
    });
  });

  describe('raw subsystem reference', () => {
    it('returns the subsystem entity reference', () => {
      const sub = makeSubsystem('SERV:subdoorsnlocks:abc');
      mockUseSubsystem.mockReturnValue(sub);

      const { result } = renderHook(() => useDoorsLocksSubsystem());

      expect(result.current.subsystem).toBe(sub);
    });
  });
});
