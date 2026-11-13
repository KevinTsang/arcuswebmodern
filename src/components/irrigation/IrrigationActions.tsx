'use client';

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { IrrigationController, LawnNGardenSubsystem } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { WaterNowPanel } from './WaterNowPanel';
import { StopWateringPanel } from './StopWateringPanel';
import { SkipWateringPanel } from './SkipWateringPanel';

interface IrrigationActionsProps {
  address: string;
}

const BUTTON = 'px-3 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium disabled:opacity-50';

/**
 * Water Now / Stop / Skip / Cancel Skip controls for an irrigation controller
 * (device panel action `irrigation-nowStopSkip`). Replaces legacy
 * `device/actions/irrigation/nowStopSkip.component`.
 */
export function IrrigationActions({ address }: IrrigationActionsProps) {
  const { zones, watering, activeMode, skippedUntil, subsystemAddress } = useIrrigationController(address);
  const { openRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const handleWaterNow = useCallback(() => {
    openRight(<WaterNowPanel address={address} />, { title: 'Water Now', key: `irrigation-water-now:${address}` });
  }, [openRight, address]);

  const handleStop = useCallback(async () => {
    // Single-zone controllers stop right away; multi-zone ones ask whether to
    // stop the current zone or the whole event.
    if (zones.length !== 1) {
      openRight(<StopWateringPanel address={address} />, { title: 'Stop Watering', key: `irrigation-stop:${address}` });
      return;
    }
    setPending(true);
    try {
      await Bridge.request(IrrigationController.CMD_CANCELV2, address, { zone: zones[0].zone });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to stop watering' }));
    } finally {
      setPending(false);
    }
  }, [zones, openRight, address, dispatch]);

  const handleSkip = useCallback(() => {
    openRight(<SkipWateringPanel address={address} />, { title: 'Skip Watering', key: `irrigation-skip:${address}` });
  }, [openRight, address]);

  const handleCancelSkip = useCallback(async () => {
    if (!subsystemAddress) return;
    setPending(true);
    try {
      await Bridge.request(LawnNGardenSubsystem.CMD_CANCELSKIP, subsystemAddress, { controller: address });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to cancel skip' }));
    } finally {
      setPending(false);
    }
  }, [subsystemAddress, address, dispatch]);

  const skipped = !!skippedUntil;

  return (
    <div className="flex items-center gap-2">
      {watering ? (
        <button
          type="button"
          data-testid={`irrigation-stop-${address}`}
          onClick={handleStop}
          disabled={pending || skipped}
          className={`${BUTTON} bg-peacock text-crane`}
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          data-testid={`irrigation-water-now-${address}`}
          onClick={handleWaterNow}
          disabled={skipped || zones.length === 0}
          className={`${BUTTON} bg-peacock text-crane`}
        >
          Water Now
        </button>
      )}
      {activeMode && (skipped ? (
        <button
          type="button"
          data-testid={`irrigation-cancel-skip-${address}`}
          onClick={handleCancelSkip}
          disabled={pending}
          className={`${BUTTON} bg-pigeon text-coot hover:bg-heron`}
        >
          Cancel Skip
        </button>
      ) : (
        <button
          type="button"
          data-testid={`irrigation-skip-${address}`}
          onClick={handleSkip}
          disabled={watering}
          className={`${BUTTON} bg-pigeon text-coot hover:bg-heron`}
        >
          Skip
        </button>
      ))}
    </div>
  );
}
