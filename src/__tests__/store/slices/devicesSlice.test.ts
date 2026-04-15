import reducer, {
  deviceAdded,
  deviceUpdated,
  deviceRemoved,
  devicesReceived,
  devicesClear,
} from '@/store/slices/devicesSlice';
import { Base, Device } from '@arcus/core';
import { makeDevice } from '../../helpers/factories';

describe('devicesSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('deviceAdded adds one device', () => {
    const state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1', { [Device.ATTR_NAME]: 'Switch' })));
    expect(state.ids).toEqual(['DRIV:dev:d1']);
    expect(state.entities['DRIV:dev:d1']?.[Device.ATTR_NAME]).toBe('Switch');
  });

  it('deviceUpdated updates an existing device', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1', { 'swit:state': 'OFF' })));
    state = reducer(state, deviceUpdated({ [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', 'swit:state': 'ON' }));
    expect(state.entities['DRIV:dev:d1']?.['swit:state']).toBe('ON');
  });

  it('deviceRemoved removes a device', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1')));
    state = reducer(state, deviceAdded(makeDevice('DRIV:dev:d2')));
    state = reducer(state, deviceRemoved('DRIV:dev:d1'));
    expect(state.ids).toEqual(['DRIV:dev:d2']);
  });

  it('devicesReceived replaces all devices', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:old')));
    state = reducer(
      state,
      devicesReceived([
        { [Base.ATTR_ADDRESS]: 'DRIV:dev:a', [Device.ATTR_NAME]: 'A' },
        { [Base.ATTR_ADDRESS]: 'DRIV:dev:b', [Device.ATTR_NAME]: 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['DRIV:dev:old']).toBeUndefined();
    expect(state.entities['DRIV:dev:a']?.[Device.ATTR_NAME]).toBe('A');
  });

  it('devicesClear empties the store', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1')));
    state = reducer(state, devicesClear());
    expect(state.ids).toEqual([]);
  });
});
