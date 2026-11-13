'use client';

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { IrrigationController } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { WATERING_DURATIONS, formatWateringDuration, type IrrigationZoneInfo } from '@/lib/irrigation';

interface IrrigationZoneRowProps {
  address: string;
  zone: IrrigationZoneInfo;
  /** Disable starting a zone (e.g. while the schedule is skipped). */
  disabled?: boolean;
}

/** Use the zone's default duration when it is one of the selectable values. */
function initialDuration(zone: IrrigationZoneInfo): number {
  return WATERING_DURATIONS.includes(zone.defaultDuration) ? zone.defaultDuration : 10;
}

/**
 * One zone of an irrigation controller with direct start/stop control:
 * pick a duration and water it now (`irrcont:WaterNowV2`), or stop it
 * (`irrcont:CancelV2`).
 */
export function IrrigationZoneRow({ address, zone, disabled = false }: IrrigationZoneRowProps) {
  const dispatch = useAppDispatch();
  const [duration, setDuration] = useState(() => initialDuration(zone));
  const [pending, setPending] = useState(false);
  const key = `${address}-${zone.zone}`;

  const handleStart = useCallback(async () => {
    setPending(true);
    try {
      await Bridge.request(IrrigationController.CMD_WATERNOWV2, address, { zone: zone.zone, duration });
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to start watering ${zone.name}` }));
    } finally {
      setPending(false);
    }
  }, [address, zone.zone, zone.name, duration, dispatch]);

  const handleStop = useCallback(async () => {
    setPending(true);
    try {
      await Bridge.request(IrrigationController.CMD_CANCELV2, address, { zone: zone.zone });
    } catch {
      dispatch(addNotification({ type: 'error', message: `Failed to stop watering ${zone.name}` }));
    } finally {
      setPending(false);
    }
  }, [address, zone.zone, zone.name, dispatch]);

  return (
    <li
      data-testid={`irrigation-zone-${key}`}
      data-state={zone.watering ? 'watering' : 'idle'}
      className="flex items-center gap-3 py-2 border-b border-heron last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <p data-testid={`irrigation-zone-name-${key}`} className="text-sm text-swift truncate">{zone.name}</p>
        <p data-testid={`irrigation-zone-status-${key}`} className="text-xs text-grouse">
          {zone.watering
            ? `Watering${zone.wateringDuration > 0 ? ` · ${formatWateringDuration(zone.wateringDuration)}` : ''}`
            : 'Idle'}
        </p>
      </div>
      {zone.watering ? (
        <button
          type="button"
          data-testid={`irrigation-zone-stop-${key}`}
          onClick={handleStop}
          disabled={pending}
          className="px-3 py-1 text-xs font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
        >
          Stop
        </button>
      ) : (
        <>
          <select
            aria-label={`Duration for ${zone.name}`}
            data-testid={`irrigation-zone-duration-${key}`}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={disabled || pending}
            className="border border-heron rounded-[var(--border-radius-base)] bg-crane px-2 py-1 text-xs text-swift"
          >
            {WATERING_DURATIONS.map((d) => (
              <option key={d} value={d}>{formatWateringDuration(d)}</option>
            ))}
          </select>
          <button
            type="button"
            data-testid={`irrigation-zone-start-${key}`}
            onClick={handleStart}
            disabled={disabled || pending}
            className="px-3 py-1 text-xs font-medium bg-pigeon text-coot hover:bg-heron rounded-[var(--border-radius-base)] disabled:opacity-50"
          >
            Start
          </button>
        </>
      )}
    </li>
  );
}
