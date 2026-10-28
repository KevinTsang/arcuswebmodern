import type { RemovalMode } from '@/arcus/types';

export type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';


/** Platform PairingStep type (pairingstep.xml): a pairing, removal or factory reset step. */
export interface PairingStep {
  id: string;
  order: number;
  /** Absent from the platform's default removal step, which only has a title and info. */
  instructions?: string[];
  title?: string;
  info?: string;
}

// ── Device removal ────────────────────────────────────────────────
// dev:Remove is pairing in reverse: it returns PairingSteps, and for hub
// devices it puts the hub into unpairing mode. Driven by useDeviceRemoval
// through deviceRemovalSlice.

/**
 * - `idle` — nothing in progress
 * - `confirm` — "Are you sure?" prompt
 * - `requesting` — dev:Remove in flight
 * - `removing` — steps shown, waiting for base:Deleted
 * - `timedOut` — no base:Deleted within REMOVE_TIMEOUT; Force Remove offered
 * - `confirmForce` — Force Remove confirmation
 * - `forcing` — dev:ForceRemove sent, waiting for base:Deleted (at most FORCE_REMOVE_TIMEOUT)
 */
export type RemovalStage =
  | 'idle'
  | 'confirm'
  | 'requesting'
  | 'removing'
  | 'timedOut'
  | 'confirmForce'
  | 'forcing';

/** UI state of one device's removal flow (deviceRemovalSlice). */
export interface DeviceRemovalState {
  /** Device the flow is for; another address starts a new flow (`deviceChanged`). */
  address: string;
  stage: RemovalStage;
  /** Removal mode from the dev:Remove response, null until it arrives. */
  mode: RemovalMode | null;
  /** Steps from the dev:Remove response, empty until it arrives. */
  steps: PairingStep[];
  /** STOP_UNPAIRING in flight after Cancel. */
  cancelling: boolean;
}

export const initialRemovalState: DeviceRemovalState = {
  address: '',
  stage: 'idle',
  mode: null,
  steps: [],
  cancelling: false,
};

/** What useDeviceRemoval returns: the flow's UI state and the user's actions. */
export interface DeviceRemovalFlow {
  stage: RemovalStage;
  /** Removal mode from the dev:Remove response, null until it arrives. */
  mode: RemovalMode | null;
  /** The removal runs on the hub (HUB_AUTOMATIC / HUB_MANUAL), so Cancel stops it. */
  hubMode: boolean;
  steps: PairingStep[];
  /** STOP_UNPAIRING in flight after Cancel. */
  cancelling: boolean;
  requestRemove: () => void;
  dismissRemove: () => void;
  remove: () => Promise<void>;
  cancel: () => Promise<void>;
  requestForceRemove: () => void;
  dismissForceRemove: () => void;
  forceRemove: () => Promise<void>;
}

/**
 * How a removal attempt ended: `active` until the device is removed,
 * dev:Remove fails, the user cancels, or the panel closes or switches device
 * (`abandoned`).
 */
export type RemovalOutcome = 'active' | 'removed' | 'failed' | 'cancelled' | 'abandoned';

/**
 * One dev:Remove attempt, from Yes, Remove until the device is removed or the
 * flow ends. Bookkeeping for the hook's side effects, not UI state, so it
 * lives in a ref rather than in deviceRemovalSlice.
 */
export interface RemovalSession {
  name: string;
  /** Hub in the store when dev:Remove was sent; STOP_UNPAIRING goes to it. */
  hub: string | null;
  /** Hub-attached device by protocol: a dev:Remove that failed may still have started unpairing. */
  hubDevice: boolean;
  /** Mode from the dev:Remove response, null until it arrives. */
  mode: RemovalMode | null;
  /** The hub may be unpairing because of this removal; cleared once STOP_UNPAIRING succeeds. */
  unpairing: boolean;
  /** STOP_UNPAIRING in flight, shared by everyone waiting on it. */
  stopping: Promise<boolean> | null;
  /** dev:ForceRemove sent: the platform deletes the record whether or not the panel stays open. */
  forced: boolean;
  outcome: RemovalOutcome;
  timer: ReturnType<typeof setTimeout> | null;
}

