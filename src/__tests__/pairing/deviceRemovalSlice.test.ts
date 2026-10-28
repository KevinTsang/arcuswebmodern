import { PairingDevice } from '@arcus/core';
import {
  initialRemovalState,
  type DeviceRemovalState,
  type PairingStep,
  type RemovalStage,
} from '@/components/pairing/types';
import {
  deviceRemovalReducer,
  canTransition,
  removeRequested,
  removeDismissed,
  removeSent,
  removeAccepted,
  removeFailed,
  removeTimedOut,
  forceRemoveRequested,
  forceRemoveDismissed,
  forceRemoveSent,
  forceRemoveFailed,
  cancelStarted,
  cancelFinished,
  deviceChanged,
  type DeviceRemovalAction,
} from '@/components/pairing/deviceRemovalSlice';

// ── Helpers ───────────────────────────────────────────────────────────

const DEVICE = 'DRIV:dev:lamp';
const OTHER_DEVICE = 'DRIV:dev:other';

const STEPS: PairingStep[] = [{ id: 'pair/remove1', order: 1, instructions: ['Press the button.'] }];
const ACCEPTED = { mode: PairingDevice.REMOVEMODE_HUB_MANUAL, steps: STEPS };

const STAGES: RemovalStage[] = ['idle', 'confirm', 'requesting', 'removing', 'timedOut', 'confirmForce', 'forcing'];

function inStage(stage: RemovalStage, overrides: Partial<DeviceRemovalState> = {}): DeviceRemovalState {
  return { ...initialRemovalState, address: DEVICE, stage, ...overrides };
}

/**
 * Each transition and the stages it applies from, with any extra state it
 * needs (cancelFinished only applies while cancelling).
 */
const TRANSITIONS: Array<[string, DeviceRemovalAction, RemovalStage[], Partial<DeviceRemovalState>?]> = [
  ['removeRequested', removeRequested(), ['idle']],
  ['removeDismissed', removeDismissed(), ['confirm']],
  ['removeSent', removeSent(), ['idle', 'confirm']],
  ['removeAccepted', removeAccepted(ACCEPTED), ['requesting']],
  ['removeFailed', removeFailed(), ['requesting']],
  ['removeTimedOut', removeTimedOut(), ['removing']],
  ['forceRemoveRequested', forceRemoveRequested(), ['timedOut']],
  ['forceRemoveDismissed', forceRemoveDismissed(), ['confirmForce']],
  ['forceRemoveSent', forceRemoveSent(), ['confirmForce']],
  ['forceRemoveFailed', forceRemoveFailed(), ['forcing']],
  ['cancelStarted', cancelStarted(), ['removing', 'timedOut']],
  ['cancelFinished', cancelFinished(), ['removing', 'timedOut'], { cancelling: true }],
];

const INVALID = TRANSITIONS.flatMap(([name, action, validFrom, overrides]) =>
  STAGES.filter((stage) => !validFrom.includes(stage)).map(
    (stage) => [name, stage, action, overrides ?? {}] as const,
  ),
);

// ── Tests ─────────────────────────────────────────────────────────────

describe('deviceRemovalSlice', () => {
  it('returns the initial state for an unknown action', () => {
    expect(deviceRemovalReducer(undefined, { type: 'unknown' })).toEqual(initialRemovalState);
    expect(initialRemovalState.stage).toBe('idle');
    expect(initialRemovalState.mode).toBeNull();
    expect(initialRemovalState.steps).toEqual([]);
    expect(initialRemovalState.cancelling).toBe(false);
  });

  describe('stage transitions', () => {
    it.each<[string, DeviceRemovalAction, RemovalStage, RemovalStage]>([
      ['removeRequested', removeRequested(), 'idle', 'confirm'],
      ['removeDismissed', removeDismissed(), 'confirm', 'idle'],
      ['removeSent', removeSent(), 'idle', 'requesting'],
      ['removeSent', removeSent(), 'confirm', 'requesting'],
      ['removeAccepted', removeAccepted(ACCEPTED), 'requesting', 'removing'],
      ['removeFailed', removeFailed(), 'requesting', 'confirm'],
      ['removeTimedOut', removeTimedOut(), 'removing', 'timedOut'],
      ['forceRemoveRequested', forceRemoveRequested(), 'timedOut', 'confirmForce'],
      ['forceRemoveDismissed', forceRemoveDismissed(), 'confirmForce', 'timedOut'],
      ['forceRemoveSent', forceRemoveSent(), 'confirmForce', 'forcing'],
      ['forceRemoveFailed', forceRemoveFailed(), 'forcing', 'timedOut'],
    ])('%s moves %s → %s', (_name, action, from, to) => {
      const prev = inStage(from);
      const next = deviceRemovalReducer(prev, action);
      expect(next.stage).toBe(to);
      expect(canTransition(prev, action)).toBe(true);
    });

    it('does not mutate the previous state', () => {
      const prev = inStage('idle');
      const next = deviceRemovalReducer(prev, removeRequested());
      expect(prev.stage).toBe('idle');
      expect(next).not.toBe(prev);
    });
  });

  describe('removeAccepted', () => {
    it('stores the mode and steps from the dev:Remove response', () => {
      const next = deviceRemovalReducer(inStage('requesting'), removeAccepted(ACCEPTED));
      expect(next.mode).toBe(PairingDevice.REMOVEMODE_HUB_MANUAL);
      expect(next.steps).toEqual(STEPS);
    });

    it('accepts a response with no mode or steps', () => {
      const next = deviceRemovalReducer(inStage('requesting'), removeAccepted({ mode: null, steps: [] }));
      expect(next.stage).toBe('removing');
      expect(next.mode).toBeNull();
      expect(next.steps).toEqual([]);
    });
  });

  describe('cancel', () => {
    it.each<RemovalStage>(['removing', 'timedOut'])('cancelStarted / cancelFinished toggle cancelling in %s', (stage) => {
      const cancelling = deviceRemovalReducer(inStage(stage), cancelStarted());
      expect(cancelling).toEqual(inStage(stage, { cancelling: true }));

      expect(deviceRemovalReducer(cancelling, cancelFinished())).toEqual(inStage(stage));
    });

    it('ignores cancelStarted while already cancelling', () => {
      const prev = inStage('removing', { cancelling: true });
      expect(deviceRemovalReducer(prev, cancelStarted())).toBe(prev);
    });

    it.each<RemovalStage>(['removing', 'timedOut'])('ignores cancelFinished in %s when not cancelling', (stage) => {
      const prev = inStage(stage);
      expect(deviceRemovalReducer(prev, cancelFinished())).toBe(prev);
    });

    it('still times out while cancelling', () => {
      const next = deviceRemovalReducer(inStage('removing', { cancelling: true }), removeTimedOut());
      expect(next.stage).toBe('timedOut');
      expect(next.cancelling).toBe(true);
    });

    it('does not offer Force Remove while cancelling', () => {
      const prev = inStage('timedOut', { cancelling: true });
      expect(deviceRemovalReducer(prev, forceRemoveRequested())).toBe(prev);
    });
  });

  describe('deviceChanged', () => {
    it.each(STAGES)('starts over for the new device from %s', (stage) => {
      const prev = inStage(stage, { ...ACCEPTED, cancelling: true });
      expect(deviceRemovalReducer(prev, deviceChanged(OTHER_DEVICE))).toEqual({
        ...initialRemovalState,
        address: OTHER_DEVICE,
      });
    });

    it('ignores the address the flow is already for', () => {
      const prev = inStage('removing', ACCEPTED);
      expect(deviceRemovalReducer(prev, deviceChanged(DEVICE))).toBe(prev);
      expect(canTransition(prev, deviceChanged(DEVICE))).toBe(false);
    });
  });

  describe('invalid transitions', () => {
    it.each(INVALID)('ignores %s from %s', (_name, stage, action, overrides) => {
      const prev = inStage(stage, overrides);
      expect(deviceRemovalReducer(prev, action)).toBe(prev);
      expect(canTransition(prev, action)).toBe(false);
    });

    it('covers every transition from every stage', () => {
      const valid = TRANSITIONS.reduce((n, [, , validFrom]) => n + validFrom.length, 0);
      expect(valid + INVALID.length).toBe(TRANSITIONS.length * STAGES.length);
    });
  });

  it('namespaces its action types', () => {
    expect(removeSent().type).toBe('deviceRemoval/removeSent');
    expect(deviceChanged(DEVICE).type).toBe('deviceRemoval/deviceChanged');
  });
});
