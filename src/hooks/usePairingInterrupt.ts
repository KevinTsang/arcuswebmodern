'use client';

/**
 * Stops the hub's pairing mode when a care alarm or an alarm incident goes off.
 *
 * Mirrors the legacy pairing page (pages/pairing/pairing.js), whose
 * `careAlarmState` and `currentIncident` setters call
 * `subpairing:StopSearching` as soon as the care subsystem reports ALERT or an
 * incident becomes current — including when one is already active on entry.
 */

import { useEffect, useRef } from 'react';
import { CareSubsystem, PairingSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useCareSubsystem } from './useCareSubsystem';
import type { PairingInterruptReason } from '@/components/pairing/types';

interface UsePairingInterruptOptions {
  /** Pairing subsystem address, or null before subsystems load. */
  pairingSubAddr: string | null;
  /** Only interrupt while the hub may be in pairing mode (not hub registration or after a device paired). */
  enabled: boolean;
  /** True once the current pairing has been interrupted; cleared when the user resumes. */
  interrupted: boolean;
  /** Called synchronously when an interruption starts, before StopSearching is sent. */
  onInterrupt: (reason: PairingInterruptReason) => void;
}

/**
 * @returns the alarm currently blocking pairing, or null when none is active.
 */
export function usePairingInterrupt({
  pairingSubAddr,
  enabled,
  interrupted,
  onInterrupt,
}: UsePairingInterruptOptions): PairingInterruptReason | null {
  const dispatch = useAppDispatch();
  const currentIncident = useAppSelector((s) => s.incidents.currentIncident);
  const { alarmState } = useCareSubsystem();

  const activeReason: PairingInterruptReason | null = currentIncident
    ? 'incident'
    : alarmState === CareSubsystem.ALARMSTATE_ALERT
      ? 'care'
      : null;

  // Guards against firing twice before `interrupted` propagates back.
  const firedRef = useRef(false);
  useEffect(() => {
    if (!interrupted) firedRef.current = false;
  }, [interrupted]);

  useEffect(() => {
    if (!enabled || interrupted || !activeReason || firedRef.current) return;
    firedRef.current = true;
    onInterrupt(activeReason);

    if (!pairingSubAddr) return;
    const stopSearching = async () => {
      try {
        await Bridge.request(PairingSubsystem.CMD_STOPSEARCHING, pairingSubAddr, {});
      } catch {
        dispatch(addNotification({
          type: 'error',
          message: 'Failed to turn off pairing mode. The hub may still be searching for devices.',
        }));
      }
    };
    stopSearching();
  },[enabled, interrupted, activeReason, pairingSubAddr, onInterrupt, dispatch]);

  return activeReason;
}
