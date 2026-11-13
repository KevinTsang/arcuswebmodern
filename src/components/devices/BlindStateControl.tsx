'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Somfyv1 } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { getBlindStatus } from '@/lib/shadeStatus';

/**
 * Somfy motors take a few seconds to travel and report no progress, so
 * Open/Close stay disabled this long after any command, as in the legacy client.
 */
export const BLIND_COOLDOWN_MS = 5000;

type BlindCommand =
  | typeof Somfyv1.CMD_GOTOOPEN
  | typeof Somfyv1.CMD_GOTOCLOSED
  | typeof Somfyv1.CMD_GOTOFAVORITE;

const FAILURE_MESSAGES: Record<BlindCommand, string> = {
  [Somfyv1.CMD_GOTOOPEN]: 'Failed to open the blinds',
  [Somfyv1.CMD_GOTOCLOSED]: 'Failed to close the blinds',
  [Somfyv1.CMD_GOTOFAVORITE]: 'Failed to move the blinds to their favorite position',
};

/**
 * Somfy V1 blind/shade control: Open/Close (Up/Down for shades) and Favorite,
 * the pre-programmed positions the Somfy bridge supports.
 */
export default function BlindStateControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const { openLabel, closeLabel } = getBlindStatus(device);
  const [coolingDown, setCoolingDown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const send = useCallback(async (command: BlindCommand) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCoolingDown(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCoolingDown(false);
    }, BLIND_COOLDOWN_MS);
    try {
      await sendCommand(command);
    } catch {
      dispatch(addNotification({ type: 'error', message: FAILURE_MESSAGES[command] }));
    }
  }, [sendCommand, dispatch]);

  const handleOpen = useCallback(() => send(Somfyv1.CMD_GOTOOPEN), [send]);
  const handleClose = useCallback(() => send(Somfyv1.CMD_GOTOCLOSED), [send]);
  const handleFavorite = useCallback(() => send(Somfyv1.CMD_GOTOFAVORITE), [send]);

  const buttonClass =
    'px-3 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-pigeon text-coot hover:bg-heron disabled:opacity-50 disabled:hover:bg-pigeon';

  return (
    <div role="group" aria-label="Blind position" className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleOpen}
        disabled={coolingDown}
        data-testid={`device-blind-open-${address}`}
        className={buttonClass}
      >
        {openLabel}
      </button>
      <button
        type="button"
        onClick={handleClose}
        disabled={coolingDown}
        data-testid={`device-blind-close-${address}`}
        className={buttonClass}
      >
        {closeLabel}
      </button>
      <button
        type="button"
        onClick={handleFavorite}
        data-testid={`device-blind-favorite-${address}`}
        className={buttonClass}
      >
        Favorite
      </button>
    </div>
  );
}
