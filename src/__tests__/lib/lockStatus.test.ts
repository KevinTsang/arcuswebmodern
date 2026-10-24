import { Device, DeviceAdvanced, DoorLock } from '@arcus/core';
import { WARN_JAM, getLockStatus } from '@/lib/lockStatus';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import { getDeviceStatusText } from '@/hooks/useDeviceConfig';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

const ADDRESS = 'DRIV:dev:lock';
const JAM = { [WARN_JAM]: 'Door lock may be jammed' };

function makeLock(lockState?: string, errors?: Record<string, string>): DeviceEntity {
  return makeDevice(ADDRESS, {
    [Device.ATTR_DEVTYPEHINT]: 'Lock',
    ...(lockState !== undefined && { [DoorLock.ATTR_LOCKSTATE]: lockState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  });
}

describe('getLockStatus', () => {
  it.each([
    [DoorLock.LOCKSTATE_LOCKED, 'Locked', DoorLock.LOCKSTATE_UNLOCKED],
    [DoorLock.LOCKSTATE_UNLOCKED, 'Unlocked', DoorLock.LOCKSTATE_LOCKED],
    [DoorLock.LOCKSTATE_LOCKING, 'Locking', DoorLock.LOCKSTATE_LOCKED],
    [DoorLock.LOCKSTATE_UNLOCKING, 'Unlocking', DoorLock.LOCKSTATE_LOCKED],
  ])('maps %s to label %s and target %s', (lockState, label, target) => {
    expect(getLockStatus(makeLock(lockState))).toEqual({ state: lockState, jammed: false, label, target });
  });

  it.each([
    [DoorLock.LOCKSTATE_LOCKED, DoorLock.LOCKSTATE_UNLOCKED],
    [DoorLock.LOCKSTATE_UNLOCKED, DoorLock.LOCKSTATE_LOCKED],
    [DoorLock.LOCKSTATE_LOCKING, DoorLock.LOCKSTATE_LOCKED],
    [DoorLock.LOCKSTATE_UNLOCKING, DoorLock.LOCKSTATE_LOCKED],
  ])('labels a jammed %s lock Jammed and keeps target %s', (lockState, target) => {
    expect(getLockStatus(makeLock(lockState, JAM))).toEqual({ state: lockState, jammed: true, label: 'Jammed', target });
  });

  it('detects WARN_JAM by key, even with an empty message', () => {
    expect(getLockStatus(makeLock(DoorLock.LOCKSTATE_UNLOCKED, { [WARN_JAM]: '' })).jammed).toBe(true);
  });

  it('ignores unrelated device errors', () => {
    expect(getLockStatus(makeLock(DoorLock.LOCKSTATE_UNLOCKED, { WARN_BATTERY: 'Low' })).jammed).toBe(false);
  });

  it.each([undefined, 'BOLT_OUT', 'constructor', 'toString'])('treats %s as an unknown state that can still be locked', (lockState) => {
    expect(getLockStatus(makeLock(lockState))).toEqual({
      state: null,
      jammed: false,
      label: 'Unknown',
      target: DoorLock.LOCKSTATE_LOCKED,
    });
  });

  it('offers no target when the device is missing', () => {
    expect(getLockStatus(undefined)).toEqual({ state: null, jammed: false, label: 'Unknown', target: null });
  });
});

describe('getDeviceStatusText for locks', () => {
  function statusText(device: DeviceEntity): string {
    return getDeviceStatusText(device, resolveDeviceConfig(device));
  }

  it.each([
    [DoorLock.LOCKSTATE_LOCKED, 'Locked'],
    [DoorLock.LOCKSTATE_UNLOCKED, 'Unlocked'],
    [DoorLock.LOCKSTATE_LOCKING, 'Locking'],
    [DoorLock.LOCKSTATE_UNLOCKING, 'Unlocking'],
  ])('shows %s as %s, matching the control', (lockState, text) => {
    const lock = makeLock(lockState);
    expect(statusText(lock)).toBe(text);
    expect(statusText(lock)).toBe(getLockStatus(lock).label);
  });

  it('shows Jammed while devadv:errors has WARN_JAM', () => {
    expect(statusText(makeLock(DoorLock.LOCKSTATE_LOCKING, JAM))).toBe('Jammed');
  });

  it('shows Unknown instead of Unlocked when the lock state is missing', () => {
    expect(statusText(makeLock())).toBe('Unknown');
  });
});
