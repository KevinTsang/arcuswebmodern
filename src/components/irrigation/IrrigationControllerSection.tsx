'use client';

import { useCallback } from 'react';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useSidePanel } from '@/components/SidePanel';
import { DevicePanel } from '@/components/devices/DevicePanel';
import { SCHEDULE_MODE_LABELS } from '@/lib/irrigation';
import { IrrigationSchedulePanel } from './IrrigationSchedulePanel';
import { IrrigationZoneList } from './IrrigationZoneList';

interface IrrigationControllerSectionProps {
  address: string;
}

/**
 * One irrigation controller on the Lawn & Garden page: its device row (with
 * Water Now / Stop / Skip), schedule status, and per-zone controls.
 */
export function IrrigationControllerSection({ address }: IrrigationControllerSectionProps) {
  const { activeMode, skippedUntil } = useIrrigationController(address);
  const { openRight } = useSidePanel();

  const handleOpenSchedule = useCallback(() => {
    openRight(<IrrigationSchedulePanel address={address} />, { title: 'Watering Schedule', key: `irrigation-schedule:${address}` });
  }, [openRight, address]);

  return (
    <section data-testid={`irrigation-controller-${address}`} className="mb-6">
      <DevicePanel address={address} />
      <div className="flex items-center justify-between gap-2 px-2 py-2">
        <p data-testid={`irrigation-schedule-status-${address}`} className="text-xs text-coot">
          {activeMode ? `${SCHEDULE_MODE_LABELS[activeMode]} schedule` : 'Manual watering (no schedule)'}
          {skippedUntil && ` · Skipped until ${new Date(skippedUntil).toLocaleString()}`}
        </p>
        <button
          type="button"
          data-testid={`irrigation-open-schedule-${address}`}
          onClick={handleOpenSchedule}
          className="text-xs text-peacock hover:underline"
        >
          Schedule
        </button>
      </div>
      <div className="px-2">
        <h4 className="text-xs font-medium text-grouse uppercase tracking-wide mb-1">Zones</h4>
        <IrrigationZoneList address={address} />
      </div>
    </section>
  );
}
