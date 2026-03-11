import reducer, {
  setPlaceId,
  setPlace,
  setPreferences,
  setProducts,
  setReady,
  clearPlace,
  type PlaceState,
} from '@/store/slices/placeSlice';

const initial: PlaceState = {
  placeId: null,
  place: null,
  preferences: null,
  products: [],
  ready: false,
};

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

  it('setPlace stores place record', () => {
    const place = { 'place:name': 'Home', 'base:address': 'SERV:place:p1' };
    const state = reducer(initial, setPlace(place));
    expect(state.place).toEqual(place);
  });

  it('setPreferences stores preferences', () => {
    const prefs = { dashboardCards: [{ serviceName: 'ALARM' }] };
    const state = reducer(initial, setPreferences(prefs));
    expect(state.preferences).toEqual(prefs);
  });

  it('setProducts stores products array', () => {
    const products = [{ 'product:id': 'prod1' }];
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
