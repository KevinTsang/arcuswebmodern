/**
 * Tests for loadPlaceDataThunk — how the active place record is stored while
 * a place loads.
 */

import { configureStore } from '@reduxjs/toolkit';
import { Base, Place, Person } from '@arcus/core';
import authReducer from '@/store/slices/authSlice';
import placeReducer, { updatePlace } from '@/store/slices/placeSlice';
import devicesReducer from '@/store/slices/devicesSlice';
import subsystemsReducer from '@/store/slices/subsystemsSlice';
import rulesReducer from '@/store/slices/rulesSlice';
import scenesReducer from '@/store/slices/scenesSlice';
import schedulersReducer from '@/store/slices/schedulersSlice';
import incidentsReducer from '@/store/slices/incidentsSlice';
import peopleReducer from '@/store/slices/peopleSlice';
import hubReducer from '@/store/slices/hubSlice';
import invitationsReducer from '@/store/slices/invitationsSlice';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockListRuleTemplates = jest.fn();
jest.mock('@arcus/core/services', () => ({
  ProductCatalogService: {
    GetProducts: () => Promise.resolve({ products: [] }),
    GetProduct: () => Promise.resolve({}),
  },
  SubsystemService: { ListSubsystems: () => Promise.resolve({ subsystems: [] }) },
  SchedulerService: { ListSchedulers: () => Promise.resolve({ schedulers: [] }) },
  SceneService: { ListScenes: () => Promise.resolve({ scenes: [] }) },
  RuleService: {
    ListRules: () => Promise.resolve({ rules: [] }),
    ListRuleTemplates: (...args: any[]) => mockListRuleTemplates(...args),
  },
}));

/** base:GetAttributes responses for each place address. */
const placeLoads = new Map<string, () => Promise<PlaceData>>();

const mockBridgeRequest = jest.fn((command: string, address: string) => {
  switch (command) {
    case Base.CMD_GETATTRIBUTES: {
      const load = placeLoads.get(address);
      return load ? load() : Promise.resolve({});
    }
    case Place.CMD_LISTDEVICES:
      return Promise.resolve({ devices: [] });
    case Place.CMD_LISTPERSONS:
      return Promise.resolve({ persons: [] });
    case Place.CMD_GETHUB:
      return Promise.resolve({ hub: {} });
    case Person.CMD_PENDINGINVITATIONS:
      return Promise.resolve({ invitations: [] });
    default:
      return Promise.resolve({});
  }
});
jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: [string, string]) => mockBridgeRequest(...args) },
}));

import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';

// ── Helpers ───────────────────────────────────────────────────────────

function makePlace(id: string, name: string): PlaceData {
  return {
    [Base.ATTR_ADDRESS]: `SERV:place:${id}`,
    [Base.ATTR_ID]: id,
    [Place.ATTR_NAME]: name,
    [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_BASIC,
  };
}

const HOME = makePlace('p1', 'Home');
const LAKE = makePlace('p2', 'Lake House');
const CABIN = makePlace('p3', 'Cabin');

/** A promise the test resolves or rejects by hand. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const flushPromises = () => new Promise((r) => setTimeout(r, 0));

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
      invitations: invitationsReducer,
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  placeLoads.clear();
  for (const place of [HOME, LAKE, CABIN]) {
    placeLoads.set(place[Base.ATTR_ADDRESS], () => Promise.resolve(place));
  }
  mockListRuleTemplates.mockResolvedValue({ ruleTemplates: [] });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('loadPlaceDataThunk', () => {
  it('loads the place record and marks the place ready', async () => {
    const store = createTestStore();

    await store.dispatch(loadPlaceDataThunk('p1'));

    expect(store.getState().place).toMatchObject({ placeId: 'p1', place: HOME, ready: true });
  });

  it('stores the place as soon as it loads, so ValueChanges during the rest of the load are kept', async () => {
    const templates = deferred<{ ruleTemplates: [] }>();
    mockListRuleTemplates.mockReturnValue(templates.promise);
    const store = createTestStore();

    const load = store.dispatch(loadPlaceDataThunk('p1'));
    await flushPromises();
    expect(store.getState().place.place).toEqual(HOME);
    expect(store.getState().place.ready).toBe(false);

    // A place ValueChange arrives while rule templates are still loading
    store.dispatch(updatePlace({
      [Base.ATTR_ADDRESS]: HOME[Base.ATTR_ADDRESS],
      [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
    }));
    templates.resolve({ ruleTemplates: [] });
    await load;

    expect(store.getState().place.place).toEqual({ ...HOME, [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM });
    expect(store.getState().place.ready).toBe(true);
  });

  it("drops the previous place's record when the new place fails to load", async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const store = createTestStore();
    await store.dispatch(loadPlaceDataThunk('p1'));
    placeLoads.set(LAKE[Base.ATTR_ADDRESS], () => Promise.reject(new Error('timeout')));

    await store.dispatch(loadPlaceDataThunk('p2'));

    expect(store.getState().place).toMatchObject({ placeId: 'p2', place: null, ready: true });
    consoleError.mockRestore();
  });

  it('keeps the newest place when an older load finishes last', async () => {
    const lakeLoad = deferred<PlaceData>();
    placeLoads.set(LAKE[Base.ATTR_ADDRESS], () => lakeLoad.promise);
    const store = createTestStore();

    // Switch to p2, then to p3 before p2 has loaded
    const slowLoad = store.dispatch(loadPlaceDataThunk('p2'));
    await store.dispatch(loadPlaceDataThunk('p3'));
    lakeLoad.resolve(LAKE);
    await slowLoad;

    expect(store.getState().place.placeId).toBe('p3');
    expect(store.getState().place.place).toEqual(CABIN);
  });
});
