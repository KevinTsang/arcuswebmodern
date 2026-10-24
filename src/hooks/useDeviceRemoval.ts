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
 * Cancel, the panel unmounting) therefore sends STOP_UNPAIRING.
 *
 * If base:Deleted doesn't arrive within REMOVE_TIMEOUT the flow offers
 * dev:ForceRemove, which deletes the platform record without excluding the
 * device from the network.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { Base, Device, Hub } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { ArcusPayload } from '@/store/entityTypes';

/** How long to wait for base:Deleted before offering Force Remove (legacy: 4 minutes). */
export const REMOVE_TIMEOUT = 4 * 60 * 1000;

/** dev:Remove response modes (devicebase.xml). */
export const RemovalMode = {
  CLOUD: 'CLOUD',
  HUB_AUTOMATIC: 'HUB_AUTOMATIC',
  HUB_MANUAL: 'HUB_MANUAL',
} as const;

export type RemovalModeValue = (typeof RemovalMode)[keyof typeof RemovalMode];

/** A removal step (platform PairingStep type) from the dev:Remove response. */
export interface RemovalStep {
  id?: string;
  order?: number;
  title?: string;
  info?: string;
  instructions?: string[];
}

/** dev:Remove response. */
export interface RemoveResponse {
  mode?: RemovalModeValue;
  steps?: RemovalStep[];
  video?: string;
}

/**
 * - `idle` — nothing in progress
 * - `confirm` — "Are you sure?" prompt
 * - `requesting` — dev:Remove in flight
 * - `removing` — steps shown, waiting for base:Deleted
 * - `timedOut` — no base:Deleted within REMOVE_TIMEOUT; Force Remove offered
 * - `confirmForce` — Force Remove confirmation
 * - `forcing` — dev:ForceRemove sent, waiting for base:Deleted
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
  mode: RemovalModeValue | null;
  steps: RemovalStep[];
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

const STOP_UNPAIRING = 'STOP_UNPAIRING';

function isHubMode(mode: RemovalModeValue | undefined): boolean {
  return mode === RemovalMode.HUB_AUTOMATIC || mode === RemovalMode.HUB_MANUAL;
}

/**
 * @param address device being removed
 * @param name device name, used in notifications
 * @param onClose closes the panel; called once the device is removed or on Cancel
 */
export function useDeviceRemoval(address: string, name: string, onClose: () => void): DeviceRemovalFlow {
  const dispatch = useAppDispatch();
  const hubAddress = useAppSelector((s) => s.hub.hub?.[Base.ATTR_ADDRESS] ?? '');
  const [stage, setStage] = useState<RemovalStage>('idle');
  const [response, setResponse] = useState<RemoveResponse | null>(null);
  const [cancelling, setCancelling] = useState(false);

  /** dev:Remove sent and the flow not yet ended (removed, cancelled or unmounted). */
  const activeRef = useRef(false);
  /** Our dev:Remove may have left the hub in unpairing mode. */
  const unpairingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameRef = useRef(name);
  // Latest values for the long-lived listener and unmount cleanup, which must
  // not re-run (and stop unpairing) just because these change.
  const hubAddressRef = useRef(hubAddress);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    hubAddressRef.current = hubAddress;
    onCloseRef.current = onClose;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Take the hub out of unpairing mode if our dev:Remove may have put it there. */
  const stopUnpairing = useCallback(async (): Promise<boolean> => {
    const hubAddr = hubAddressRef.current;
    if (!unpairingRef.current || !hubAddr) return true;
    unpairingRef.current = false;
    try {
      await Bridge.request(Hub.CMD_UNPAIRINGREQUEST, hubAddr, { actionType: STOP_UNPAIRING });
      return true;
    } catch {
      unpairingRef.current = true;
      dispatch(addNotification({ type: 'error', message: 'Failed to take the hub out of removal mode' }));
      return false;
    }
  }, [dispatch]);

  // Watch for this device's base:Deleted for as long as the panel is open, so
  // a deletion that lands before the dev:Remove response isn't missed.
  useEffect(() => {
    const onDeleted = (obj: ArcusPayload) => {
      if (obj[Base.ATTR_ADDRESS] !== address || !activeRef.current) return;
      activeRef.current = false;
      clearTimer();
      void stopUnpairing();
      dispatch(addNotification({ type: 'success', message: `${nameRef.current} removed` }));
      onCloseRef.current();
    };

    cornea.on(`${Device.NAMESPACE} ${Base.EVENT_DELETED}`, onDeleted);
    return () => {
      cornea.off(`${Device.NAMESPACE} ${Base.EVENT_DELETED}`, onDeleted);
      // Panel closed or replaced mid-removal: don't leave the hub unpairing.
      activeRef.current = false;
      clearTimer();
      void stopUnpairing();
    };
  }, [address, dispatch, clearTimer, stopUnpairing]);

  const remove = useCallback(async () => {
    nameRef.current = name;
    activeRef.current = true;
    setStage('requesting');

    let resp: RemoveResponse;
    try {
      resp = await Bridge.request<RemoveResponse>(Device.CMD_REMOVE, address, {});
    } catch {
      activeRef.current = false;
      dispatch(addNotification({ type: 'error', message: `Failed to remove ${name}` }));
      setStage('confirm');
      return;
    }

    if (isHubMode(resp.mode)) unpairingRef.current = true;
    if (!activeRef.current) {
      // Deleted, or the panel closed, while dev:Remove was in flight.
      void stopUnpairing();
      return;
    }

    setResponse(resp);
    setStage('removing');
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setStage('timedOut');
    }, REMOVE_TIMEOUT);
  }, [address, name, dispatch, clearTimer, stopUnpairing]);

  const cancel = useCallback(async () => {
    setCancelling(true);
    const stopped = await stopUnpairing();
    setCancelling(false);
    if (!stopped) return; // stay put so the user can retry
    activeRef.current = false;
    clearTimer();
    onCloseRef.current();
  }, [stopUnpairing, clearTimer]);

  const forceRemove = useCallback(async () => {
    setStage('forcing');
    try {
      // Success is reported when base:Deleted arrives.
      await Bridge.request(Device.CMD_FORCEREMOVE, address, {});
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to force remove ${nameRef.current}` }));
      setStage('timedOut');
    }
  }, [address, dispatch]);

  const requestRemove = useCallback(() => setStage('confirm'), []);
  const dismissRemove = useCallback(() => setStage('idle'), []);
  const requestForceRemove = useCallback(() => setStage('confirmForce'), []);
  const dismissForceRemove = useCallback(() => setStage('timedOut'), []);

  return useMemo(
    () => ({
      stage,
      mode: response?.mode ?? null,
      steps: response?.steps ?? [],
      cancelling,
      requestRemove,
      dismissRemove,
      remove,
      cancel,
      requestForceRemove,
      dismissForceRemove,
      forceRemove,
    }),
    [stage, response, cancelling, requestRemove, dismissRemove, remove, cancel, requestForceRemove, dismissForceRemove, forceRemove],
  );
}
