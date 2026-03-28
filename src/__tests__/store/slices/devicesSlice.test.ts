import reducer, {
  deviceAdded,
  deviceUpdated,
  deviceRemoved,
  devicesReceived,
  devicesClear,
} from '@/store/slices/devicesSlice';

function makeDevice(address: string, extra: Record<string, unknown> = {}) {
  return { id: address, 'base:address': address, ...extra };
}

describe('devicesSlice', () => {
  it('returns empty initial state', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
  });

  it('deviceAdded adds one device', () => {
    const state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1', { 'dev:name': 'Switch' })));
    expect(state.ids).toEqual(['DRIV:dev:d1']);
    expect(state.entities['DRIV:dev:d1']?.['dev:name']).toBe('Switch');
  });

  it('deviceUpdated updates an existing device', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1', { 'swit:state': 'OFF' })));
    state = reducer(state, deviceUpdated({ 'base:address': 'DRIV:dev:d1', 'swit:state': 'ON' }));
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
        { 'base:address': 'DRIV:dev:a', 'dev:name': 'A' },
        { 'base:address': 'DRIV:dev:b', 'dev:name': 'B' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['DRIV:dev:old']).toBeUndefined();
    expect(state.entities['DRIV:dev:a']?.['dev:name']).toBe('A');
  });

  it('devicesClear empties the store', () => {
    let state = reducer(undefined, deviceAdded(makeDevice('DRIV:dev:d1')));
    state = reducer(state, devicesClear());
    expect(state.ids).toEqual([]);
  });
});
