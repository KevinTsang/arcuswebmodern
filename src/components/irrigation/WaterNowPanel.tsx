'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { Device, IrrigationController } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { WATERING_DURATIONS, formatWateringDuration } from '@/lib/irrigation';

interface WaterNowPanelProps {
  address: string;
}

const DEFAULT_DURATION = 10;

/** Pick the zone's default duration when it is one of the selectable values. */
function initialDuration(defaultDuration: number | undefined): number {
  return defaultDuration && WATERING_DURATIONS.includes(defaultDuration) ? defaultDuration : DEFAULT_DURATION;
}

/**
 * Side panel to start watering one zone for a chosen duration
 * (`irrcont:WaterNowV2`). Replaces legacy `irrigation/waterNow.component`.
 */
export function WaterNowPanel({ address }: WaterNowPanelProps) {
  const { device, zones } = useIrrigationController(address);
  const { closeRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [zone, setZone] = useState(zones[0]?.zone ?? '');
  const [duration, setDuration] = useState(() => initialDuration(zones[0]?.defaultDuration));
  const [saving, setSaving] = useState(false);

  const name = (device?.[Device.ATTR_NAME] as string | undefined) ?? 'Irrigation Controller';

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!zone) return;
    setSaving(true);
    try {
      await Bridge.request(IrrigationController.CMD_WATERNOWV2, address, { zone, duration });
      closeRight();
    } catch {
      setSaving(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to start watering' }));
    }
  }, [address, zone, duration, closeRight, dispatch]);

  if (zones.length === 0) {
    return <p data-testid="water-now-no-zones" className="text-sm text-grouse">This controller has no zones.</p>;
  }

  return (
    <form onSubmit={handleSubmit} data-testid="water-now-panel" className="space-y-4">
      <p className="text-sm text-grouse">{name}</p>
      {zones.length > 1 && (
        <label className="block">
          <span className="text-sm font-medium text-swift">Zone</span>
          <select
            data-testid="water-now-zone"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="mt-1 w-full border border-heron rounded-[var(--border-radius-base)] bg-crane px-3 py-2 text-sm text-swift"
          >
            {zones.map((z) => (
              <option key={z.zone} value={z.zone}>{z.name}</option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className="text-sm font-medium text-swift">Duration</span>
        <select
          data-testid="water-now-duration"
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="mt-1 w-full border border-heron rounded-[var(--border-radius-base)] bg-crane px-3 py-2 text-sm text-swift"
        >
          {WATERING_DURATIONS.map((d) => (
            <option key={d} value={d}>{formatWateringDuration(d)}</option>
          ))}
        </select>
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="water-now-save"
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
        >
          {saving ? 'Starting…' : 'Water Now'}
        </button>
        <button
          type="button"
          data-testid="water-now-cancel"
          onClick={closeRight}
          className="px-4 py-2 text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] hover:bg-heron"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
