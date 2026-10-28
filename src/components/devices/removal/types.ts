import type { RemovalMode } from '@/arcus/types';
import type { PairingStep } from '@/components/pairing/types';

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
