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

const mockAuthLogout = jest.fn().mockResolvedValue(undefined);

jest.mock('@arcus/core/auth', () => ({
  __esModule: true,
  default: { logout: (...args: any[]) => mockAuthLogout(...args) },
}));

jest.mock('@arcus/core/property-aliases', () => ({
  __esModule: true,
  default: {
    alias: {},
  },
}));

const mockBridgeRequest = jest.fn().mockResolvedValue({ invitations: [] });

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

import { configureStore } from '@reduxjs/toolkit';
import { Base, Device, Switch, Hub, Person, Place, AlarmIncident } from '@arcus/core';
import authReducer, { loginSuccess, logout } from '@/store/slices/authSlice';
import devicesReducer from '@/store/slices/devicesSlice';
import subsystemsReducer from '@/store/slices/subsystemsSlice';
import rulesReducer from '@/store/slices/rulesSlice';
import scenesReducer from '@/store/slices/scenesSlice';
import schedulersReducer from '@/store/slices/schedulersSlice';
import incidentsReducer from '@/store/slices/incidentsSlice';
import peopleReducer from '@/store/slices/peopleSlice';
import hubReducer from '@/store/slices/hubSlice';
import placeReducer, { setPlaceId, setPlace } from '@/store/slices/placeSlice';
import uiReducer from '@/store/slices/uiSlice';
import invitationsReducer from '@/store/slices/invitationsSlice';
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
      invitations: invitationsReducer,
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
    mockAuthLogout.mockClear();
  });

  it('subscribes to Cornea events after loginSuccess', () => {
    const store = createTestStore();
    expect(listeners.size).toBe(0);

    store.dispatch(loginSuccess({ person: { name: 'Test' }, account: { state: 'ACTIVE' } }));

    // Should have subscribed to dev, sub, rule, scene, scheduler, incident, person (7 × 3 = 21)
    // plus hub (3) + place (1) + sess (1) = 26
    expect(listeners.size).toBeGreaterThan(0);
    expect(listeners.has(`dev ${Base.EVENT_VALUECHANGE}`)).toBe(true);
    expect(listeners.has(`dev ${Base.EVENT_ADDED}`)).toBe(true);
    expect(listeners.has(`dev ${Base.EVENT_DELETED}`)).toBe(true);
    expect(listeners.has(`hub ${Base.EVENT_VALUECHANGE}`)).toBe(true);
    expect(listeners.has(`place ${Base.EVENT_VALUECHANGE}`)).toBe(true);
    expect(listeners.has('sess unauthorized')).toBe(true);
    expect(listeners.has('sess sess:SessionExpired')).toBe(true);
  });

  it('dispatches deviceUpdated on dev base:ValueChange', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    // First add a device
    emit(`dev ${Base.EVENT_ADDED}`, { [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', [Device.ATTR_NAME]: 'Light' });
    expect(store.getState().devices.ids).toContain('DRIV:dev:d1');

    // Then update it
    emit(`dev ${Base.EVENT_VALUECHANGE}`, { [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', [Switch.ATTR_STATE]: 'ON' });
    expect(store.getState().devices.entities['DRIV:dev:d1']?.[Switch.ATTR_STATE]).toBe('ON');
  });

  it('dispatches deviceRemoved on dev base:Deleted', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));
    emit(`dev ${Base.EVENT_ADDED}`, { [Base.ATTR_ADDRESS]: 'DRIV:dev:d1', [Device.ATTR_NAME]: 'Light' });

    emit(`dev ${Base.EVENT_DELETED}`, { [Base.ATTR_ADDRESS]: 'DRIV:dev:d1' });
    expect(store.getState().devices.ids).not.toContain('DRIV:dev:d1');
  });

  it('updates hub on hub events', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`hub ${Base.EVENT_ADDED}`, { [Base.ATTR_ADDRESS]: 'SERV:hub:h1', [Hub.ATTR_STATE]: 'NORMAL' });
    expect(store.getState().hub.hub?.[Hub.ATTR_STATE]).toBe('NORMAL');

    emit(`hub ${Base.EVENT_VALUECHANGE}`, { [Hub.ATTR_STATE]: 'PAIRING' });
    expect(store.getState().hub.hub?.[Hub.ATTR_STATE]).toBe('PAIRING');
  });

  describe('place base:ValueChange', () => {
    const HOME_ADDRESS = 'SERV:place:p1';
    const homePlace = {
      [Base.ATTR_ADDRESS]: HOME_ADDRESS,
      [Base.ATTR_ID]: 'p1',
      [Place.ATTR_NAME]: 'Home',
      [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
    };

    function createStoreWithActivePlace() {
      const store = createTestStore();
      store.dispatch(loginSuccess({ person: {}, account: {} }));
      store.dispatch(setPlaceId('p1'));
      store.dispatch(setPlace(homePlace));
      return store;
    }

    it('merges the changed attributes into the active place', () => {
      const store = createStoreWithActivePlace();

      emit(`place ${Base.EVENT_VALUECHANGE}`, { [Base.ATTR_ADDRESS]: HOME_ADDRESS, [Place.ATTR_NAME]: 'Main House' });

      expect(store.getState().place.place).toEqual({ ...homePlace, [Place.ATTR_NAME]: 'Main House' });
    });

    it('ignores a ValueChange for a place other than the active one', () => {
      const store = createStoreWithActivePlace();

      // e.g. the user edited "Lake House" from Settings while Home is active
      emit(`place ${Base.EVENT_VALUECHANGE}`, { [Base.ATTR_ADDRESS]: 'SERV:place:p2', [Place.ATTR_NAME]: 'Lake House' });

      expect(store.getState().place.place).toEqual(homePlace);
    });

    it('ignores a ValueChange before a place is loaded', () => {
      const store = createTestStore();
      store.dispatch(loginSuccess({ person: {}, account: {} }));
      store.dispatch(setPlaceId('p1'));

      emit(`place ${Base.EVENT_VALUECHANGE}`, { [Base.ATTR_ADDRESS]: HOME_ADDRESS, [Place.ATTR_NAME]: 'Main House' });

      expect(store.getState().place.place).toBeNull();
    });
  });

  it('dispatches logout on sess unauthorized', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: { n: 1 }, account: { n: 1 } }));
    expect(store.getState().auth.authenticated).toBe(true);

    emit('sess unauthorized');
    expect(store.getState().auth.authenticated).toBe(false);
  });

  it('expires the session and tears down the socket on sess:SessionExpired', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: { n: 1 }, account: { n: 1 } }));
    expect(store.getState().auth.authenticated).toBe(true);

    emit('sess sess:SessionExpired');

    // Session flagged expired (AuthProvider redirects to /login?expired=1)
    expect(store.getState().auth.authenticated).toBe(false);
    expect(store.getState().auth.sessionExpired).toBe(true);
    // Socket torn down without a server request (session is already gone)
    expect(mockAuthLogout).toHaveBeenCalledWith(false);
  });

  it('unsubscribes the SessionExpired listener after session expiry', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));
    expect(listeners.has('sess sess:SessionExpired')).toBe(true);

    emit('sess sess:SessionExpired');

    // off() leaves an (empty) Set behind rather than removing the key
    const fns = listeners.get('sess sess:SessionExpired');
    expect(fns).toBeDefined();
    expect(fns?.size).toBe(0);
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

  it('subscribes to incident alert events after loginSuccess', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    expect(listeners.has(`incident ${AlarmIncident.EVENT_SECURITYALERT}`)).toBe(true);
    expect(listeners.has(`incident ${AlarmIncident.EVENT_WATERALERT}`)).toBe(true);
    expect(listeners.has(`incident ${AlarmIncident.EVENT_COALERT}`)).toBe(true);
    expect(listeners.has(`incident ${AlarmIncident.EVENT_SMOKEALERT}`)).toBe(true);
    expect(listeners.has(`incident ${AlarmIncident.EVENT_PANICALERT}`)).toBe(true);
  });

  it('dispatches setCurrentIncident on SecurityAlert', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_SECURITYALERT}`, { [Base.ATTR_ADDRESS]: 'SERV:incident:i1' });
    expect(store.getState().incidents.currentIncident).toBe('SERV:incident:i1');
  });

  it('dispatches setCurrentIncident on WaterAlert', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_WATERALERT}`, { [Base.ATTR_ADDRESS]: 'SERV:incident:i2' });
    expect(store.getState().incidents.currentIncident).toBe('SERV:incident:i2');
  });

  it('dispatches setCurrentIncident on COAlert', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_COALERT}`, { [Base.ATTR_ADDRESS]: 'SERV:incident:i3' });
    expect(store.getState().incidents.currentIncident).toBe('SERV:incident:i3');
  });

  it('dispatches setCurrentIncident on SmokeAlert', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_SMOKEALERT}`, { [Base.ATTR_ADDRESS]: 'SERV:incident:i4' });
    expect(store.getState().incidents.currentIncident).toBe('SERV:incident:i4');
  });

  it('dispatches setCurrentIncident on PanicAlert', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_PANICALERT}`, { [Base.ATTR_ADDRESS]: 'SERV:incident:i5' });
    expect(store.getState().incidents.currentIncident).toBe('SERV:incident:i5');
  });

  it('does not set current incident when address missing', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));

    emit(`incident ${AlarmIncident.EVENT_SECURITYALERT}`, {});
    expect(store.getState().incidents.currentIncident).toBeNull();
  });

  it('unsubscribes alert events on logout', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: {}, account: {} }));
    expect(listeners.has(`incident ${AlarmIncident.EVENT_SECURITYALERT}`)).toBe(true);

    store.dispatch(logout());
    // All listeners should have been removed
    const securityFns = listeners.get(`incident ${AlarmIncident.EVENT_SECURITYALERT}`);
    expect(!securityFns || securityFns.size === 0).toBe(true);
  });

  it('subscribes to invitation events after loginSuccess', () => {
    const store = createTestStore();
    store.dispatch(loginSuccess({ person: { personId: 'p1' }, account: {} }));

    expect(listeners.has(`place ${Person.EVENT_INVITATIONPENDING}`)).toBe(true);
    expect(listeners.has(`place ${Person.EVENT_INVITATIONCANCELLED}`)).toBe(true);
  });

  it('fetches pending invitations on InvitationPending event', async () => {
    const store = createTestStore();
    mockBridgeRequest.mockResolvedValue({
      invitations: [{ code: 'inv1', placeName: 'Home', inviteeEmail: 'a@b.com' }],
    });

    store.dispatch(loginSuccess({ person: { personId: 'p1' }, account: {} }));
    emit(`place ${Person.EVENT_INVITATIONPENDING}`);

    await flushPromises();

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Person.CMD_PENDINGINVITATIONS,
      'SERV:person:p1',
      {},
    );
  });

  it('fetches pending invitations on InvitationCancelled event', async () => {
    const store = createTestStore();
    mockBridgeRequest.mockResolvedValue({ invitations: [] });

    store.dispatch(loginSuccess({ person: { personId: 'p1' }, account: {} }));
    emit(`place ${Person.EVENT_INVITATIONCANCELLED}`);

    await flushPromises();

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      Person.CMD_PENDINGINVITATIONS,
      'SERV:person:p1',
      {},
    );
  });
});
