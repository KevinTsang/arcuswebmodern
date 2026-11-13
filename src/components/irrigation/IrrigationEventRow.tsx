'use client';

import { useCallback } from 'react';
import {
  WEEK_DAY_LABELS, describeEventZones, formatTimeOfDay, sortWeekDays,
  type IrrigationScheduleEvent, type IrrigationZoneInfo,
} from '@/lib/irrigation';

interface IrrigationEventRowProps {
  event: IrrigationScheduleEvent;
  zones: IrrigationZoneInfo[];
  onEdit: (event: IrrigationScheduleEvent) => void;
}

/** Summary of one schedule event: start time, days (weekly), zones and total time. */
export function IrrigationEventRow({ event, zones, onEdit }: IrrigationEventRowProps) {
  const transitions = event.events ?? [];
  const totalMinutes = transitions.reduce((sum, t) => sum + (t.duration ?? 0), 0);
  const zoneCount = transitions.length;

  const handleEdit = useCallback(() => onEdit(event), [onEdit, event]);

  return (
    <li
      data-testid={`irrigation-event-${event.eventId}`}
      className="flex items-center gap-3 py-3 border-b border-heron last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <p data-testid={`irrigation-event-time-${event.eventId}`} className="text-sm font-medium text-swift">
          {formatTimeOfDay(event.timeOfDay)}
        </p>
        {event.days && event.days.length > 0 && (
          <p data-testid={`irrigation-event-days-${event.eventId}`} className="text-xs text-coot">
            {sortWeekDays(event.days).map((d) => WEEK_DAY_LABELS[d] ?? d).join(', ')}
          </p>
        )}
        <p data-testid={`irrigation-event-zones-${event.eventId}`} className="text-xs text-grouse truncate">
          {zoneCount} {zoneCount === 1 ? 'Zone' : 'Zones'}
          {zoneCount > 0 && `: ${describeEventZones(event, zones)}`}
          {totalMinutes > 0 && ` · ${totalMinutes} min`}
        </p>
      </div>
      <button
        type="button"
        data-testid={`irrigation-event-edit-${event.eventId}`}
        onClick={handleEdit}
        className="text-xs text-peacock hover:underline"
      >
        Edit
      </button>
    </li>
  );
}
