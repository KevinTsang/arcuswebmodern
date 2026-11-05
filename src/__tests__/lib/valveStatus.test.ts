import { Device, Valve } from '@arcus/core';
import { getValveStatus } from '@/lib/valveStatus';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import { getDeviceStatusText } from '@/hooks/useDeviceConfig';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

const ADDRESS = 'DRIV:dev:valve';

function makeValve(valveState?: string): DeviceEntity {
  return makeDevice(ADDRESS, {
    [Device.ATTR_DEVTYPEHINT]: 'Water Valve',
    ...(valveState !== undefined && { [Valve.ATTR_VALVESTATE]: valveState }),
  });
}

describe('getValveStatus', () => {
  it.each([
    [Valve.VALVESTATE_CLOSED, 'Closed', Valve.VALVESTATE_OPEN],
    [Valve.VALVESTATE_OPEN, 'Open', Valve.VALVESTATE_CLOSED],
    [Valve.VALVESTATE_OPENING, 'Opening', Valve.VALVESTATE_CLOSED],
    [Valve.VALVESTATE_CLOSING, 'Closing', Valve.VALVESTATE_CLOSED],
    [Valve.VALVESTATE_OBSTRUCTION, 'Obstructed', Valve.VALVESTATE_CLOSED],
  ])('maps %s to label %s and target %s', (valveState, label, target) => {
    expect(getValveStatus(makeValve(valveState))).toEqual({ state: valveState, label, target });
  });

  it.each([undefined, 'STUCK', 'constructor', 'toString'])('treats %s as an unknown state that can still be closed', (valveState) => {
    expect(getValveStatus(makeValve(valveState))).toEqual({
      state: null,
      label: 'Unknown',
      target: Valve.VALVESTATE_CLOSED,
    });
  });

  it('offers no target when the device is missing', () => {
    expect(getValveStatus(undefined)).toEqual({ state: null, label: 'Unknown', target: null });
  });
});

describe('getDeviceStatusText for water valves', () => {
  function statusText(device: DeviceEntity): string {
    return getDeviceStatusText(device, resolveDeviceConfig(device));
  }

  it.each([
    [Valve.VALVESTATE_CLOSED, 'Closed'],
    [Valve.VALVESTATE_OPEN, 'Open'],
    [Valve.VALVESTATE_OPENING, 'Opening'],
    [Valve.VALVESTATE_CLOSING, 'Closing'],
    [Valve.VALVESTATE_OBSTRUCTION, 'Obstructed'],
  ])('shows %s as %s, matching the control', (valveState, text) => {
    const valve = makeValve(valveState);
    expect(statusText(valve)).toBe(text);
    expect(statusText(valve)).toBe(getValveStatus(valve).label);
  });

  it('shows Unknown instead of Closed when the valve state is missing', () => {
    expect(statusText(makeValve())).toBe('Unknown');
  });
});
