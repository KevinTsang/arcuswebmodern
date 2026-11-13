'use client';

import { useIrrigationController } from '@/hooks/useIrrigationController';
import { IrrigationZoneRow } from './IrrigationZoneRow';

interface IrrigationZoneListProps {
  address: string;
}

/** The zones of one irrigation controller, each with start/stop controls. */
export function IrrigationZoneList({ address }: IrrigationZoneListProps) {
  const { zones, skippedUntil } = useIrrigationController(address);

  if (zones.length === 0) {
    return (
      <p data-testid={`irrigation-zones-empty-${address}`} className="text-xs text-grouse">
        This controller has not reported any zones.
      </p>
    );
  }

  return (
    <ul data-testid={`irrigation-zones-${address}`}>
      {zones.map((zone) => (
        <IrrigationZoneRow key={zone.zone} address={address} zone={zone} disabled={!!skippedUntil} />
      ))}
    </ul>
  );
}
