'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import { Device, LawnNGardenSubsystem } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

interface StopWateringPanelProps {
  address: string;
}

const OPTIONS = [
  { value: 'current', label: 'Current Zone Only' },
  { value: 'all', label: 'All Zones' },
] as const;

type StopOption = (typeof OPTIONS)[number]['value'];

/**
 * Side panel asking whether to stop only the current zone or every zone in the
 * running event (`sublawnngarden:StopWatering`). Replaces legacy
 * `irrigation/stopWatering.component`.
 */
export function StopWateringPanel({ address }: StopWateringPanelProps) {
  const { device, subsystemAddress } = useIrrigationController(address);
  const { closeRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const [selected, setSelected] = useState<StopOption>('all');
  const [saving, setSaving] = useState(false);

  const name = (device?.[Device.ATTR_NAME] as string | undefined) ?? 'Irrigation Controller';

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!subsystemAddress) return;
    setSaving(true);
    try {
      await Bridge.request(LawnNGardenSubsystem.CMD_STOPWATERING, subsystemAddress, {
        controller: address,
        currentOnly: selected === 'current',
      });
      closeRight();
    } catch {
      setSaving(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to stop watering' }));
    }
  }, [address, subsystemAddress, selected, closeRight, dispatch]);

  return (
    <form onSubmit={handleSubmit} data-testid="stop-watering-panel" className="space-y-4">
      <p className="text-sm text-grouse">{name}</p>
      <p className="text-sm text-swift">
        Do you want to stop watering the current zone only, or all zones in this event?
      </p>
      <fieldset className="space-y-2">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex items-center gap-2 text-sm text-swift">
            <input
              type="radio"
              name="stop-watering"
              data-testid={`stop-watering-${opt.value}`}
              checked={selected === opt.value}
              onChange={() => setSelected(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="stop-watering-save"
          disabled={saving || !subsystemAddress}
          className="px-4 py-2 text-sm font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
        >
          {saving ? 'Stopping…' : 'Stop Watering'}
        </button>
        <button
          type="button"
          data-testid="stop-watering-cancel"
          onClick={closeRight}
          className="px-4 py-2 text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] hover:bg-heron"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
