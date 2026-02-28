import reducer, {
  addNotification,
  removeNotification,
  clearNotifications,
  setPanelContent,
  setCareAlarmState,
  setLoading,
  type UiState,
} from '@/store/slices/uiSlice';

const initial: UiState = {
  notifications: [],
  panelContent: null,
  careAlarmState: null,
  loading: false,
};

describe('uiSlice', () => {
  it('returns initial state', () => {
    expect(reducer(undefined, { type: 'unknown' })).toEqual(initial);
  });

  it('addNotification appends a notification with generated id and timestamp', () => {
    const state = reducer(initial, addNotification({ type: 'success', message: 'Done!' }));
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].type).toBe('success');
    expect(state.notifications[0].message).toBe('Done!');
    expect(state.notifications[0].id).toBeDefined();
    expect(state.notifications[0].timestamp).toBeGreaterThan(0);
  });

  it('removeNotification removes by id', () => {
    let state = reducer(initial, addNotification({ type: 'info', message: 'A' }));
    state = reducer(state, addNotification({ type: 'error', message: 'B' }));
    const idToRemove = state.notifications[0].id;
    state = reducer(state, removeNotification(idToRemove));
    expect(state.notifications).toHaveLength(1);
    expect(state.notifications[0].message).toBe('B');
  });

  it('clearNotifications empties list', () => {
    let state = reducer(initial, addNotification({ type: 'info', message: 'A' }));
    state = reducer(state, addNotification({ type: 'info', message: 'B' }));
    state = reducer(state, clearNotifications());
    expect(state.notifications).toEqual([]);
  });

  it('setPanelContent sets/clears panel', () => {
    let state = reducer(initial, setPanelContent('device-detail'));
    expect(state.panelContent).toBe('device-detail');
    state = reducer(state, setPanelContent(null));
    expect(state.panelContent).toBeNull();
  });

  it('setCareAlarmState sets alarm state', () => {
    const state = reducer(initial, setCareAlarmState('ALERT'));
    expect(state.careAlarmState).toBe('ALERT');
  });

  it('setLoading toggles loading', () => {
    let state = reducer(initial, setLoading(true));
    expect(state.loading).toBe(true);
    state = reducer(state, setLoading(false));
    expect(state.loading).toBe(false);
  });
});
