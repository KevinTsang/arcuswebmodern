'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Shade } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  SHADE_LEVEL_MAX, SHADE_LEVEL_MIN, getShadeStatus, stepShadeLevel,
} from '@/lib/shadeStatus';

/** Wait this long after the last step before sending shade:level, as the legacy client did. */
export const SHADE_SAVE_DELAY_MS = 1000;

const OBSTRUCTED_HINT = 'The shade reported an obstruction. Clear it, then set the position again.';

/** A level the user picked that the device hasn't reported yet. */
interface PendingLevel {
  /** The level to show and send. */
  level: number;
  /** The device's level when the edit started; a newer report replaces the pending level. */
  base: number | null;
}

/**
 * Shade position control: steps shade:level (0 = closed, 100 = open) in 10%
 * increments. Steps are batched and sent once the user pauses, so tapping +
 * three times moves the shade once.
 */
export default function ShadeLevelControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const { level: reported, obstructed } = getShadeStatus(device);
  const [pending, setPending] = useState<PendingLevel | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(() => void) | null>(null);
  const hintId = `device-shade-hint-${address}`;

  // Show the picked level until the device reports something new.
  const level = pending && pending.base === reported ? pending.level : reported;

  const save = useCallback(async (target: number) => {
    try {
      await setAttribute(Shade.ATTR_LEVEL, target);
    } catch {
      setPending(null);
      dispatch(addNotification({ type: 'error', message: 'Failed to move the shade' }));
    }
  }, [setAttribute, dispatch]);

  // Send a step still waiting on the timer if the control unmounts.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    sendRef.current?.();
  }, []);

  const handleStep = useCallback((direction: 1 | -1) => {
    const next = stepShadeLevel(level ?? SHADE_LEVEL_MIN, direction);
    setPending({ level: next, base: reported });
    if (timerRef.current) clearTimeout(timerRef.current);
    const send = () => {
      timerRef.current = null;
      sendRef.current = null;
      void save(next);
    };
    sendRef.current = send;
    timerRef.current = setTimeout(send, SHADE_SAVE_DELAY_MS);
  }, [level, reported, save]);

  const handleDown = useCallback(() => handleStep(-1), [handleStep]);
  const handleUp = useCallback(() => handleStep(1), [handleStep]);

  const stepClass =
    'w-7 h-7 flex items-center justify-center rounded-[var(--border-radius-base)] text-sm font-medium bg-pigeon text-coot hover:bg-heron disabled:opacity-50 disabled:hover:bg-pigeon';

  return (
    <div className="flex flex-col items-end gap-1">
      <div
        role="group"
        aria-label="Shade position"
        aria-describedby={obstructed ? hintId : undefined}
        className="flex items-center gap-2"
      >
        <button
          type="button"
          onClick={handleDown}
          disabled={level !== null && level <= SHADE_LEVEL_MIN}
          aria-label="Lower shade"
          data-testid={`device-shade-down-${address}`}
          className={stepClass}
        >
          &minus;
        </button>
        <span
          data-testid={`device-shade-level-${address}`}
          data-level={level ?? ''}
          aria-live="polite"
          className="min-w-12 text-center text-sm font-medium text-swift"
        >
          {level !== null ? `${level}%` : '--'}
        </span>
        <button
          type="button"
          onClick={handleUp}
          disabled={level !== null && level >= SHADE_LEVEL_MAX}
          aria-label="Raise shade"
          data-testid={`device-shade-up-${address}`}
          className={stepClass}
        >
          +
        </button>
      </div>
      {obstructed && (
        <p id={hintId} data-testid={hintId} className="max-w-48 text-right text-xs text-cardinal">
          {OBSTRUCTED_HINT}
        </p>
      )}
    </div>
  );
}
