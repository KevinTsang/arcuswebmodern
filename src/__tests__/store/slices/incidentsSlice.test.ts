import reducer, {
  incidentAdded,
  incidentUpdated,
  incidentRemoved,
  incidentsReceived,
  incidentsClear,
  setCurrentIncident,
} from '@/store/slices/incidentsSlice';
import { Base } from '@arcus/core';
import { makeIncident } from '../../helpers/factories';

describe('incidentsSlice', () => {
  it('returns empty initial state with null currentIncident', () => {
    const state = reducer(undefined, { type: 'unknown' });
    expect(state.ids).toEqual([]);
    expect(state.entities).toEqual({});
    expect(state.currentIncident).toBeNull();
  });

  it('incidentAdded adds one incident', () => {
    const state = reducer(
      undefined,
      incidentAdded(makeIncident('SERV:incident:i1', { 'incident:alertState': 'ALERT' })),
    );
    expect(state.ids).toEqual(['SERV:incident:i1']);
    expect(state.entities['SERV:incident:i1']?.['incident:alertState']).toBe('ALERT');
  });

  it('incidentUpdated updates an existing incident', () => {
    let state = reducer(
      undefined,
      incidentAdded(makeIncident('SERV:incident:i1', { 'incident:alertState': 'ALERT' })),
    );
    state = reducer(
      state,
      incidentUpdated({ [Base.ATTR_ADDRESS]: 'SERV:incident:i1', 'incident:alertState': 'COMPLETE' }),
    );
    expect(state.entities['SERV:incident:i1']?.['incident:alertState']).toBe('COMPLETE');
  });

  it('incidentRemoved removes an incident', () => {
    let state = reducer(undefined, incidentAdded(makeIncident('SERV:incident:i1')));
    state = reducer(state, incidentAdded(makeIncident('SERV:incident:i2')));
    state = reducer(state, incidentRemoved('SERV:incident:i1'));
    expect(state.ids).toEqual(['SERV:incident:i2']);
  });

  it('incidentsReceived replaces all incidents', () => {
    let state = reducer(undefined, incidentAdded(makeIncident('SERV:incident:old')));
    state = reducer(
      state,
      incidentsReceived([
        { [Base.ATTR_ADDRESS]: 'SERV:incident:a' },
        { [Base.ATTR_ADDRESS]: 'SERV:incident:b' },
      ]),
    );
    expect(state.ids).toHaveLength(2);
    expect(state.entities['SERV:incident:old']).toBeUndefined();
  });

  it('incidentsClear empties incidents and resets currentIncident', () => {
    let state = reducer(undefined, incidentAdded(makeIncident('SERV:incident:i1')));
    state = reducer(state, setCurrentIncident('SERV:incident:i1'));
    state = reducer(state, incidentsClear());
    expect(state.ids).toEqual([]);
    expect(state.currentIncident).toBeNull();
  });

  it('setCurrentIncident sets and clears current incident', () => {
    let state = reducer(undefined, setCurrentIncident('SERV:incident:i1'));
    expect(state.currentIncident).toBe('SERV:incident:i1');
    state = reducer(state, setCurrentIncident(null));
    expect(state.currentIncident).toBeNull();
  });
});
