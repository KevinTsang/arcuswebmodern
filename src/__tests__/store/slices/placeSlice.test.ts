import reducer, {
  setPlaceId,
  setPlace,
  updatePlace,
  setPreferences,
  setProducts,
  setReady,
  clearPlace,
  type PlaceState,
} from '@/store/slices/placeSlice';
import { Base, Place, Product } from '@arcus/core';

const initial: PlaceState = {
  placeId: null,
  place: null,
  preferences: null,
  products: [],
  ready: false,
};

const HOME_ADDRESS = 'SERV:place:p1';
const LAKE_ADDRESS = 'SERV:place:p2';

const homePlace = {
  [Base.ATTR_ADDRESS]: HOME_ADDRESS,
  [Base.ATTR_ID]: 'p1',
  [Place.ATTR_NAME]: 'Home',
  [Place.ATTR_CITY]: 'Springfield',
  [Place.ATTR_SERVICELEVEL]: Place.SERVICELEVEL_PREMIUM,
};

const loaded: PlaceState = { ...initial, placeId: 'p1', place: homePlace, ready: true };

describe('placeSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('setPlaceId sets ID and resets ready', () => {
    const readyState: PlaceState = { ...initial, placeId: 'old', ready: true };
    const state = reducer(readyState, setPlaceId('place-1'));
    expect(state.placeId).toBe('place-1');
    expect(state.ready).toBe(false);
  });

  it("setPlaceId drops the previous place's record when switching places", () => {
    // If the new place then fails to load, nothing is left pointing at the old one.
    const state = reducer(loaded, setPlaceId('p2'));
    expect(state.place).toBeNull();
  });

  it('setPlaceId keeps the record when reloading the same place', () => {
    const state = reducer(loaded, setPlaceId('p1'));
    expect(state.place).toEqual(homePlace);
  });

  describe('setPlace', () => {
    it("stores the active place's record", () => {
      const state = reducer({ ...initial, placeId: 'p1' }, setPlace(homePlace));
      expect(state.place).toEqual(homePlace);
    });

    it('replaces the record with a fresh load of the same place', () => {
      const reloaded = { [Base.ATTR_ADDRESS]: HOME_ADDRESS, [Base.ATTR_ID]: 'p1', [Place.ATTR_NAME]: 'Main House' };
      const state = reducer(loaded, setPlace(reloaded));
      expect(state.place).toEqual(reloaded);
    });

    it('ignores a record for a place other than the active one', () => {
      // e.g. an earlier place load that finished after the user switched again
      const lake = { [Base.ATTR_ADDRESS]: LAKE_ADDRESS, [Base.ATTR_ID]: 'p2', [Place.ATTR_NAME]: 'Lake House' };
      const state = reducer(loaded, setPlace(lake));
      expect(state).toBe(loaded);
    });

    it('ignores a record when no place is active', () => {
      const state = reducer(initial, setPlace(homePlace));
      expect(state).toEqual(initial);
    });
  });

  describe('updatePlace', () => {
    it('merges changed attributes into the active place, keeping the rest', () => {
      const state = reducer(loaded, updatePlace({
        [Base.ATTR_ADDRESS]: HOME_ADDRESS,
        [Place.ATTR_NAME]: 'Main House',
      }));
      expect(state.place).toEqual({ ...homePlace, [Place.ATTR_NAME]: 'Main House' });
    });

    it('ignores a ValueChange for another place', () => {
      const state = reducer(loaded, updatePlace({
        [Base.ATTR_ADDRESS]: LAKE_ADDRESS,
        [Place.ATTR_NAME]: 'Lake House',
      }));
      expect(state).toBe(loaded);
    });

    it('ignores a ValueChange before a place is loaded', () => {
      const pending: PlaceState = { ...initial, placeId: 'p1' };
      const state = reducer(pending, updatePlace({
        [Base.ATTR_ADDRESS]: HOME_ADDRESS,
        [Place.ATTR_NAME]: 'Main House',
      }));
      expect(state.place).toBeNull();
    });

    it('ignores a ValueChange when no place is active', () => {
      const state = reducer(initial, updatePlace({
        [Base.ATTR_ADDRESS]: HOME_ADDRESS,
        [Place.ATTR_NAME]: 'Main House',
      }));
      expect(state).toEqual(initial);
    });

    it('merges into the new place after a switch, and ignores the previous one', () => {
      const lake = { [Base.ATTR_ADDRESS]: LAKE_ADDRESS, [Base.ATTR_ID]: 'p2', [Place.ATTR_NAME]: 'Lake House' };
      let state = reducer(loaded, setPlaceId('p2'));
      state = reducer(state, setPlace(lake));
      state = reducer(state, updatePlace({ [Base.ATTR_ADDRESS]: HOME_ADDRESS, [Place.ATTR_NAME]: 'Main House' }));
      state = reducer(state, updatePlace({ [Base.ATTR_ADDRESS]: LAKE_ADDRESS, [Place.ATTR_CITY]: 'Lakeside' }));
      expect(state.place).toEqual({ ...lake, [Place.ATTR_CITY]: 'Lakeside' });
    });
  });

  it('setPreferences stores preferences', () => {
    const prefs = { dashboardCards: [{ serviceName: 'ALARM' }] };
    const state = reducer(initial, setPreferences(prefs));
    expect(state.preferences).toEqual(prefs);
  });

  it('setProducts stores products array', () => {
    const products = [{ [Product.ATTR_ID]: 'prod1' }];
    const state = reducer(initial, setProducts(products));
    expect(state.products).toEqual(products);
  });

  it('setReady marks the place as ready', () => {
    const state = reducer(initial, setReady(true));
    expect(state.ready).toBe(true);
  });

  it('clearPlace resets everything', () => {
    const loaded: PlaceState = {
      placeId: 'p1',
      place: { name: 'Home' },
      preferences: { key: 'val' },
      products: [{ id: '1' }],
      ready: true,
    };
    const state = reducer(loaded, clearPlace());
    expect(state).toEqual(initial);
  });
});
