/**
 * Tests for the Cornea Redux middleware.
 *
 * We mock the @arcus/core/cornea module so we can simulate
 * WebSocket events and verify the correct Redux actions are dispatched.
 */

// Track event listeners registered via cornea.on/off
const listeners = new Map<string, Set<Function>>();

jest.mock('@arcus/core/cornea', () => ({
  __esModule: true,
  default: {
    on: (event: string, fn: Function) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    },
    off: (event: string, fn: Function) => {
      listeners.get(event)?.delete(fn);
    },
  },
}));

jest.mock('@arcus/core/property-aliases', () => ({
  __esModule: true,
  default: {
    alias: {},
  },
}));

import { configureStore } from '@reduxjs/toolkit';
import authReducer, { loginSuccess, logout } from '@/store/slices/authSlice';
import devicesReducer from '@/store/slices/devicesSlice';
import subsystemsReducer from '@/store/slices/subsystemsSlice';
import rulesReducer from '@/store/slices/rulesSlice';
import scenesReducer from '@/store/slices/scenesSlice';
import schedulersReducer from '@/store/slices/schedulersSlice';
import incidentsReducer from '@/store/slices/incidentsSlice';
import peopleReducer from '@/store/slices/peopleSlice';
import hubReducer from '@/store/slices/hubSlice';
import placeReducer from '@/store/slices/placeSlice';
import uiReducer from '@/store/slices/uiSlice';
import { corneaMiddleware } from '@/store/middleware/corneaMiddleware';

function createTestStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      place: placeReducer,
      devices: devicesReducer,
      subsystems: subsystemsReducer,
      rules: rulesReducer,
      scenes: scenesReducer,
      schedulers: schedulersReducer,
      incidents: incidentsReducer,
      people: peopleReducer,
      hub: hubReducer,
      ui: uiReducer,
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(corneaMiddleware),
  });
}

function emit(event: string, data?: any) {
  const fns = listeners.get(event);
  if (fns) {
    for (const fn of fns) fn(data);
  }
}

describe('corneaMiddleware', () => {
  beforeEach(() => {
    listeners.clear();
  });

  it('subscribes to Cornea events after loginSuccess', () => {
    const store = createTestStore();
    expect(listeners.size).toBe(0);

    store.dispatch(loginSuccess({ person: { name: 'Test' }, account: { state: 'ACTIVE' } }));

    // Should have subscribed to dev, sub, rule, scene, scheduler, incident, person (7 × 3 = 21)
    // plus hub (3) + place (1) + sess (1) = 26
    expect(listeners.size).toBeGreaterThan(0);
    expect(listeners.has('dev base:ValueChange')).toBe(true);
    expect(listeners.has('dev base:Added')).toBe(true);
    expect(listeners.has('dev base:Deleted')).toBe(true);
    expect(listeners.has('hub base:ValueChange')).toBe(true);
    expect(listeners.has('place base:ValueChange')).toBe(true);
    expect(listeners.has('sess unauthorized')).toBe(true);
  });

  it('dispatches deviceUpdated on dev base:ValueChange', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    // First add a device
    emit('dev base:Added', { 'base:address': 'DRIV:dev:d1', 'dev:name': 'Light' });
    expect(store.getState().devices.ids).toContain('DRIV:dev:d1');

    // Then update it
    emit('dev base:ValueChange', { 'base:address': 'DRIV:dev:d1', 'swit:state': 'ON' });
    expect(store.getState().devices.entities['DRIV:dev:d1']?.['swit:state']).toBe('ON');
  });

  it('dispatches deviceRemoved on dev base:Deleted', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));
    emit('dev base:Added', { 'base:address': 'DRIV:dev:d1', 'dev:name': 'Light' });

    emit('dev base:Deleted', { 'base:address': 'DRIV:dev:d1' });
    expect(store.getState().devices.ids).not.toContain('DRIV:dev:d1');
  });

  it('updates hub on hub events', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit('hub base:Added', { 'base:address': 'SERV:hub:h1', 'hub:state': 'NORMAL' });
    expect(store.getState().hub.hub?.['hub:state']).toBe('NORMAL');

    emit('hub base:ValueChange', { 'hub:state': 'PAIRING' });
    expect(store.getState().hub.hub?.['hub:state']).toBe('PAIRING');
  });

  it('dispatches logout on sess unauthorized', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: { n: 1 }, account: { n: 1 } }));
    expect(store.getState().auth.authenticated).toBe(true);

    emit('sess unauthorized');
    expect(store.getState().auth.authenticated).toBe(false);
  });

  it('unsubscribes from Cornea events after logout', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));
    const sizeBefore = listeners.size;
    expect(sizeBefore).toBeGreaterThan(0);

    store.dispatch(logout());

    // All listeners should have been removed
    let totalListeners = 0;
    for (const fns of listeners.values()) totalListeners += fns.size;
    expect(totalListeners).toBe(0);
  });
});
