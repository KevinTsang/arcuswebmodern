/**
 * Device removal flow UI state, as a Redux Toolkit slice.
 *
 * Like the create-account wizard, the flow is local to one panel, so the slice
 * is not registered with the global store: useDeviceRemoval runs its reducer
 * through `useReducer` and dispatches the generated action creators. The
 * per-attempt bookkeeping behind the hook's side effects (the hub to stop,
 * timers, the STOP_UNPAIRING in flight) is not UI state and stays in the
 * hook's RemovalSession.
 *
 * The reducer is a state machine. Each action is a transition that applies
 * only from the stages listed here; from any other stage it is ignored and the
 * state is returned unchanged (`canTransition` reports which):
 *
 * | Action                  | From                                 | To           |
 * |-------------------------|--------------------------------------|--------------|
 * | `removeRequested`       | idle                                 | confirm      |
 * | `removeDismissed`       | confirm                              | idle         |
 * | `removeSent`            | idle, confirm                        | requesting   |
 * | `removeAccepted`        | requesting                           | removing (stores the response's mode and steps) |
 * | `removeFailed`          | requesting                           | confirm      |
 * | `removeTimedOut`        | removing                             | timedOut     |
 * | `forceRemoveRequested`  | timedOut, not cancelling             | confirmForce |
 * | `forceRemoveDismissed`  | confirmForce                         | timedOut     |
 * | `forceRemoveSent`       | confirmForce                         | forcing      |
 * | `forceRemoveFailed`     | forcing                              | timedOut     |
 * | `cancelStarted`         | removing, timedOut; not cancelling   | same stage, cancelling |
 * | `cancelFinished`        | removing, timedOut; cancelling       | same stage, not cancelling |
 * | `deviceChanged(address)`| any, for a different address         | idle for the new device (response cleared) |
 *
 * There is no terminal stage: the flow ends when the device is removed or the
 * user cancels, and the hook closes the panel (unmounting the flow) then.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { RemovalMode } from '@/arcus/types';
import type { PairingStep } from '@/components/pairing/types';
import { initialRemovalState, type DeviceRemovalState, type RemovalStage } from './types';

/** Payload of `removeAccepted`: the parts of the dev:Remove response the UI shows. */
export interface RemoveAccepted {
  mode: RemovalMode | null;
  steps: PairingStep[];
}

/** Stages Cancel is offered in (the steps view and the timed-out view). */
const CANCELLABLE: readonly RemovalStage[] = ['removing', 'timedOut'];

const deviceRemovalSlice = createSlice({
  name: 'deviceRemoval',
  initialState: initialRemovalState,
  reducers: {
    /** Remove Device clicked: ask for confirmation. */
    removeRequested(state) {
      if (state.stage === 'idle') state.stage = 'confirm';
    },
    /** Cancel on the confirmation prompt. */
    removeDismissed(state) {
      if (state.stage === 'confirm') state.stage = 'idle';
    },
    /** dev:Remove sent. */
    removeSent(state) {
      if (state.stage === 'idle' || state.stage === 'confirm') state.stage = 'requesting';
    },
    /** dev:Remove answered: show its steps and wait for base:Deleted. */
    removeAccepted(state, { payload }: PayloadAction<RemoveAccepted>) {
      if (state.stage !== 'requesting') return;
      state.stage = 'removing';
      state.mode = payload.mode;
      state.steps = payload.steps;
    },
    /** dev:Remove failed: back to the prompt so the user can retry. */
    removeFailed(state) {
      if (state.stage === 'requesting') state.stage = 'confirm';
    },
    /** No base:Deleted within REMOVE_TIMEOUT: offer Force Remove. */
    removeTimedOut(state) {
      if (state.stage === 'removing') state.stage = 'timedOut';
    },
    /** Force Remove clicked: ask for confirmation (not while Cancel is in flight). */
    forceRemoveRequested(state) {
      if (state.stage === 'timedOut' && !state.cancelling) state.stage = 'confirmForce';
    },
    /** Back on the Force Remove confirmation. */
    forceRemoveDismissed(state) {
      if (state.stage === 'confirmForce') state.stage = 'timedOut';
    },
    /** dev:ForceRemove sent. */
    forceRemoveSent(state) {
      if (state.stage === 'confirmForce') state.stage = 'forcing';
    },
    /** dev:ForceRemove failed, or base:Deleted didn't follow within FORCE_REMOVE_TIMEOUT. */
    forceRemoveFailed(state) {
      if (state.stage === 'forcing') state.stage = 'timedOut';
    },
    /** Cancel clicked: STOP_UNPAIRING in flight. */
    cancelStarted(state) {
      if (CANCELLABLE.includes(state.stage) && !state.cancelling) state.cancelling = true;
    },
    /** STOP_UNPAIRING settled after Cancel. */
    cancelFinished(state) {
      if (CANCELLABLE.includes(state.stage) && state.cancelling) state.cancelling = false;
    },
    /** The flow now shows another device: start over. */
    deviceChanged(state, { payload }: PayloadAction<string>) {
      if (state.address === payload) return;
      return { ...initialRemovalState, address: payload };
    },
  },
});

export const {
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
} = deviceRemovalSlice.actions;

export const deviceRemovalReducer = deviceRemovalSlice.reducer;

/** Union of every action the removal flow can dispatch. */
export type DeviceRemovalAction = ReturnType<
  (typeof deviceRemovalSlice.actions)[keyof typeof deviceRemovalSlice.actions]
>;

/**
 * Whether `action` is a valid transition from `state`, i.e. the reducer would
 * change the state. The hook checks this before a transition's side effects
 * (sending dev:Remove, STOP_UNPAIRING, dev:ForceRemove) so they never run from
 * a stage the UI would ignore.
 */
export function canTransition(state: DeviceRemovalState, action: DeviceRemovalAction): boolean {
  return deviceRemovalReducer(state, action) !== state;
}

export default deviceRemovalSlice;
