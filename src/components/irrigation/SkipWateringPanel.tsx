'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { Device, LawnNGardenSubsystem } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { SKIP_HOURS } from '@/lib/irrigation';

interface SkipWateringPanelProps {
  address: string;
}

/**
 * Side panel to pause a controller's schedule for 12–72 hours
 * (`sublawnngarden:Skip`), e.g. after rain. Replaces legacy
 * `irrigation/skipEvent.component`.
 */
export function SkipWateringPanel({ address }: SkipWateringPanelProps) {
  const { device, subsystemAddress } = useIrrigationController(address);
  const { closeRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [hours, setHours] = useState(24);
  const [saving, setSaving] = useState(false);

  const name = (device?.[Device.ATTR_NAME] as string | undefined) ?? 'Irrigation Controller';

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!subsystemAddress) return;
    setSaving(true);
    try {
      await Bridge.request(LawnNGardenSubsystem.CMD_SKIP, subsystemAddress, { controller: address, hours });
      closeRight();
    } catch {
      setSaving(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to skip watering' }));
    }
  }, [address, subsystemAddress, hours, closeRight, dispatch]);

  return (
    <form onSubmit={handleSubmit} data-testid="skip-watering-panel" className="space-y-4">
      <p className="text-sm text-grouse">{name}</p>
      <p className="text-sm font-medium text-swift">Skip irrigation for</p>
      <fieldset className="space-y-2">
        {SKIP_HOURS.map((h) => (
          <label key={h} className="flex items-center gap-2 text-sm text-swift">
            <input
              type="radio"
              name="skip-hours"
              data-testid={`skip-watering-${h}`}
              checked={hours === h}
              onChange={() => setHours(h)}
            />
            {h} Hours
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="skip-watering-save"
          disabled={saving || !subsystemAddress}
          className="px-4 py-2 text-sm font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Skip'}
        </button>
        <button
          type="button"
          data-testid="skip-watering-cancel"
          onClick={closeRight}
          className="px-4 py-2 text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] hover:bg-heron"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
