import { Device, DeviceAdvanced, MotorizedDoor } from '@arcus/core';
import { ERR_OBSTRUCTION, getGarageDoorStatus } from '@/lib/garageDoorStatus';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import { getDeviceStatusText } from '@/hooks/useDeviceConfig';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

const ADDRESS = 'DRIV:dev:garage';

function makeDoor(doorState?: string, errors?: Record<string, string>): DeviceEntity {
  return makeDevice(ADDRESS, {
    [Device.ATTR_DEVTYPEHINT]: 'Garage Door',
    ...(doorState !== undefined && { [MotorizedDoor.ATTR_DOORSTATE]: doorState }),
    ...(errors && { [DeviceAdvanced.ATTR_ERRORS]: errors }),
  });
}

describe('getGarageDoorStatus', () => {
  it.each([
    [MotorizedDoor.DOORSTATE_CLOSED, 'Closed', MotorizedDoor.DOORSTATE_OPEN],
    [MotorizedDoor.DOORSTATE_OPEN, 'Open', MotorizedDoor.DOORSTATE_CLOSED],
    [MotorizedDoor.DOORSTATE_OPENING, 'Opening', MotorizedDoor.DOORSTATE_CLOSED],
    [MotorizedDoor.DOORSTATE_CLOSING, 'Closing', MotorizedDoor.DOORSTATE_CLOSED],
    [MotorizedDoor.DOORSTATE_OBSTRUCTION, 'Obstructed', MotorizedDoor.DOORSTATE_CLOSED],
  ])('maps %s to label %s and target %s', (doorState, label, target) => {
    expect(getGarageDoorStatus(makeDoor(doorState))).toEqual(
      expect.objectContaining({ state: doorState, label, target }),
    );
  });

  it('reports an obstruction and no target while devadv:errors has ERR_OBSTRUCTION', () => {
    expect(getGarageDoorStatus(makeDoor(MotorizedDoor.DOORSTATE_OPEN, { [ERR_OBSTRUCTION]: '' }))).toEqual({
      state: MotorizedDoor.DOORSTATE_OPEN,
      obstructed: true,
      label: 'Obstructed',
      target: null,
    });
  });

  it('ignores unrelated device errors', () => {
    expect(getGarageDoorStatus(makeDoor(MotorizedDoor.DOORSTATE_OPEN, { WARN_BATTERY: 'Low' }))).toEqual(
      expect.objectContaining({ obstructed: false, label: 'Open', target: MotorizedDoor.DOORSTATE_CLOSED }),
    );
  });

  it.each([undefined, 'STOPPED', 'constructor', 'toString'])('treats %s as an unknown state that can still be closed', (doorState) => {
    expect(getGarageDoorStatus(makeDoor(doorState))).toEqual({
      state: null,
      obstructed: false,
      label: 'Unknown',
      target: MotorizedDoor.DOORSTATE_CLOSED,
    });
  });

  it('offers no target when the device is missing', () => {
    expect(getGarageDoorStatus(undefined)).toEqual({
      state: null,
      obstructed: false,
      label: 'Unknown',
      target: null,
    });
  });
});

describe('getDeviceStatusText for garage doors', () => {
  function statusText(device: DeviceEntity): string {
    return getDeviceStatusText(device, resolveDeviceConfig(device));
  }

  it.each([
    [MotorizedDoor.DOORSTATE_CLOSED, 'Closed'],
    [MotorizedDoor.DOORSTATE_OPEN, 'Open'],
    [MotorizedDoor.DOORSTATE_OPENING, 'Opening'],
    [MotorizedDoor.DOORSTATE_CLOSING, 'Closing'],
    [MotorizedDoor.DOORSTATE_OBSTRUCTION, 'Obstructed'],
  ])('shows %s as %s, matching the control', (doorState, text) => {
    const door = makeDoor(doorState);
    expect(statusText(door)).toBe(text);
    expect(statusText(door)).toBe(getGarageDoorStatus(door).label);
  });

  it('shows Obstructed while devadv:errors has ERR_OBSTRUCTION, even for a settled door', () => {
    expect(statusText(makeDoor(MotorizedDoor.DOORSTATE_CLOSED, { [ERR_OBSTRUCTION]: 'Garage door may be obstructed' })))
      .toBe('Obstructed');
  });

  it('shows Unknown instead of Open when the door state is missing', () => {
    expect(statusText(makeDoor())).toBe('Unknown');
  });
});
