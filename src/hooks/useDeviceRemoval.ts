/**
 * Hook driving the dev:Remove flow for one device.
 *
 * Ported from src/components/device/remove-panel/remove-panel.js.
 *
 * dev:Remove returns straight away with the removal mode and the steps to show
 * the user; the device is only gone once its base:Deleted event arrives. For
 * hub devices (HUB_AUTOMATIC / HUB_MANUAL) the platform also puts the hub into
 * unpairing mode for 5 minutes, and the hub starts a general Z-Wave exclusion
 * whatever the device's protocol — so any Z-Wave device that sends a node-info
 * frame in that window is excluded too. Every way out of the flow (success,
 * Cancel, the panel closing or switching device, a failed dev:Remove)
 * therefore sends STOP_UNPAIRING to the hub the removal was started on.
 *
 * If base:Deleted doesn't arrive within REMOVE_TIMEOUT the flow offers
 * dev:ForceRemove, which deletes the platform record without excluding the
 * device from the network.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { Base, Device, DeviceAdvanced, PairingDevice } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useDevice } from '@/hooks/useDeviceCapability';
import { addNotification } from '@/store/slices/uiSlice';
import { stopHubUnpairing } from '@/lib/hubUnpairing';
import type { AppDispatch } from '@/store/store';
import type { ArcusPayload } from '@/store/entityTypes';
import type { PairingStep } from '@/components/pairing/types';
import type { RemovalMode, RemoveResponse } from '@/arcus/types';

/** How long to wait for base:Deleted before offering Force Remove (legacy: 4 minutes). */
export const REMOVE_TIMEOUT = 4 * 60 * 1000;

/** How long to wait for base:Deleted after dev:ForceRemove succeeds before giving up. */
export const FORCE_REMOVE_TIMEOUT = 30 * 1000;

/**
 * devadv:protocol values of hub-attached devices. Before the dev:Remove
 * response arrives, legacy guessed the removal mode from these too.
 */
const HUB_PROTOCOLS: ReadonlySet<string> = new Set(['ZIGB', 'ZWAV']);

const DELETED_EVENT = `${Device.NAMESPACE} ${Base.EVENT_DELETED}`;

const HUB_MAY_STAY_UNPAIRING = 'The hub may stay in removal mode for a few minutes.';
const STOP_FAILED_MESSAGE = `Couldn't take the hub out of removal mode. ${HUB_MAY_STAY_UNPAIRING}`;

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

/** Whether a dev:Remove mode puts the hub into unpairing mode. */
export function isHubRemovalMode(mode: RemovalMode | null | undefined): boolean {
  return mode === PairingDevice.REMOVEMODE_HUB_AUTOMATIC || mode === PairingDevice.REMOVEMODE_HUB_MANUAL;
}

/** One dev:Remove attempt, from Yes, Remove until the device is removed or the flow ends. */
interface RemovalSession {
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
  /**
   * `active` until the device is removed, dev:Remove fails, the user cancels,
   * or the panel closes or switches device (`abandoned`).
   */
  outcome: 'active' | 'removed' | 'failed' | 'cancelled' | 'abandoned';
  timer: ReturnType<typeof setTimeout> | null;
}

function endSession(session: RemovalSession, outcome: RemovalSession['outcome']) {
  session.outcome = outcome;
  if (session.timer) {
    clearTimeout(session.timer);
    session.timer = null;
  }
}

/**
 * Send STOP_UNPAIRING if this removal may have left the hub unpairing.
 * Resolves false if the hub may still be unpairing: the request failed, or
 * there was no hub to send it to.
 */
function stopUnpairing(session: RemovalSession): Promise<boolean> {
  if (!session.unpairing) return Promise.resolve(true);
  if (!session.hub) return Promise.resolve(false);
  session.stopping ??= stopHubUnpairing(session.hub)
    .then(
      () => {
        session.unpairing = false;
        return true;
      },
      () => false,
    )
    .finally(() => {
      session.stopping = null;
    });
  return session.stopping;
}

/** The panel closed (or switched device) mid-removal: stop the hub and tell the user. */
function abandonSession(session: RemovalSession, dispatch: AppDispatch) {
  endSession(session, 'abandoned');
  // While dev:Remove is in flight the mode is unknown; remove() finishes the
  // job when the response arrives. Cloud removals carry on without the hub.
  if (!isHubRemovalMode(session.mode)) return;
  void stopUnpairing(session).then((stopped) => {
    if (session.forced) {
      // dev:ForceRemove deletes the record anyway; only the stop can fail.
      if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      return;
    }
    notifyCancelled(session, stopped, dispatch);
  });
}

function notifyCancelled(session: RemovalSession, stopped: boolean, dispatch: AppDispatch) {
  const message = `Removal of ${session.name} cancelled.`;
  dispatch(
    addNotification(
      stopped
        ? { type: 'warning', message }
        : { type: 'error', message: `${message} ${HUB_MAY_STAY_UNPAIRING}` },
    ),
  );
}

/**
 * @param address device being removed
 * @param name device name, used in notifications
 * @param onClose closes the panel; called once the device is removed or on Cancel
 */
export function useDeviceRemoval(address: string, name: string, onClose: () => void): DeviceRemovalFlow {
  const dispatch = useAppDispatch();
  const hubAddress = useAppSelector((s) => s.hub.hub?.[Base.ATTR_ADDRESS] ?? '');
  const protocol = useDevice(address)?.[DeviceAdvanced.ATTR_PROTOCOL] as string | undefined;
  const [stage, setStage] = useState<RemovalStage>('idle');
  const [response, setResponse] = useState<RemoveResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // A new address starts a new flow. The old flow's session is ended (and the
  // hub stopped) by the effect cleanup below.
  const [flowAddress, setFlowAddress] = useState(address);
  if (flowAddress !== address) {
    setFlowAddress(address);
    setStage('idle');
    setResponse(null);
    setCancelling(false);
  }

  /** The removal this flow is showing; null when none is running. */
  const sessionRef = useRef<RemovalSession | null>(null);
  // Latest onClose for the long-lived listener and async continuations.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Watch for this device's base:Deleted for as long as the panel is open, so
  // a deletion that lands before the dev:Remove response isn't missed.
  useEffect(() => {
    const onDeleted = (obj: ArcusPayload) => {
      const session = sessionRef.current;
      if (!session || obj[Base.ATTR_ADDRESS] !== address) return;
      sessionRef.current = null;
      endSession(session, 'removed');
      dispatch(addNotification({ type: 'success', message: `${session.name} removed` }));
      onCloseRef.current();
      void stopUnpairing(session).then((stopped) => {
        if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      });
    };

    cornea.on(DELETED_EVENT, onDeleted);
    return () => {
      cornea.off(DELETED_EVENT, onDeleted);
      const session = sessionRef.current;
      if (session) {
        sessionRef.current = null;
        abandonSession(session, dispatch);
      }
    };
  }, [address, dispatch]);

  const remove = useCallback(async () => {
    if (sessionRef.current) return;
    const session: RemovalSession = {
      name,
      hub: hubAddress || null,
      hubDevice: HUB_PROTOCOLS.has(protocol ?? ''),
      mode: null,
      unpairing: false,
      stopping: null,
      forced: false,
      outcome: 'active',
      timer: null,
    };
    sessionRef.current = session;
    setStage('requesting');

    let resp: RemoveResponse;
    try {
      resp = await Bridge.request<RemoveResponse>(Device.CMD_REMOVE, address, {});
    } catch {
      // The request may have reached the platform (cornea gives up after 50 s)
      // and started unpairing: stop it, best effort, before allowing a retry.
      if (session.hubDevice) {
        session.unpairing = true;
        await stopUnpairing(session);
      }
      // base:Deleted already reported the device removed.
      if (session.outcome === 'removed') return;
      if (sessionRef.current === session) {
        sessionRef.current = null;
        endSession(session, 'failed');
        setStage('confirm');
      }
      dispatch(addNotification({ type: 'error', message: `Failed to remove ${session.name}` }));
      return;
    }

    session.mode = resp.mode ?? null;
    if (isHubRemovalMode(session.mode)) session.unpairing = true;

    if (sessionRef.current !== session) {
      // Removed, or the panel closed, while dev:Remove was in flight.
      const stopped = await stopUnpairing(session);
      if (session.outcome === 'abandoned' && isHubRemovalMode(session.mode)) {
        notifyCancelled(session, stopped, dispatch);
      } else if (!stopped) {
        dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      }
      return;
    }

    setResponse(resp);
    setStage('removing');
    session.timer = setTimeout(() => {
      session.timer = null;
      if (sessionRef.current === session) setStage('timedOut');
    }, REMOVE_TIMEOUT);
  }, [address, name, hubAddress, protocol, dispatch]);

  const cancel = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setCancelling(true);
    const stopped = await stopUnpairing(session);
    // Removed, or the panel closed or switched device, while STOP was in flight.
    if (sessionRef.current !== session) return;
    sessionRef.current = null;
    endSession(session, 'cancelled');
    setCancelling(false);
    // Don't trap the user in the panel when the hub can't be reached or has
    // already left unpairing mode: it times out on its own.
    if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
    onCloseRef.current();
  }, [dispatch]);

  const forceRemove = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    session.forced = true;
    setStage('forcing');
    try {
      await Bridge.request(Device.CMD_FORCEREMOVE, address, {});
    } catch {
      if (sessionRef.current !== session) return;
      session.forced = false;
      dispatch(addNotification({ type: 'error', message: `Failed to force remove ${session.name}` }));
      setStage('timedOut');
      return;
    }
    // Success is reported when base:Deleted arrives, which is usually before
    // this response. Don't wait forever if it was missed.
    if (sessionRef.current !== session) return;
    session.timer = setTimeout(() => {
      session.timer = null;
      if (sessionRef.current !== session) return;
      session.forced = false;
      dispatch(addNotification({ type: 'error', message: `Couldn't confirm that ${session.name} was removed` }));
      setStage('timedOut');
    }, FORCE_REMOVE_TIMEOUT);
  }, [address, dispatch]);

  const requestRemove = useCallback(() => setStage('confirm'), []);
  const dismissRemove = useCallback(() => setStage('idle'), []);
  const requestForceRemove = useCallback(() => setStage('confirmForce'), []);
  const dismissForceRemove = useCallback(() => setStage('timedOut'), []);

  return useMemo(() => {
    const mode = response?.mode ?? null;
    return {
      stage,
      mode,
      hubMode: isHubRemovalMode(mode),
      steps: response?.steps ?? [],
      cancelling,
      requestRemove,
      dismissRemove,
      remove,
      cancel,
      requestForceRemove,
      dismissForceRemove,
      forceRemove,
    };
  }, [stage, response, cancelling, requestRemove, dismissRemove, remove, cancel, requestForceRemove, dismissForceRemove, forceRemove]);
}
