'use client';

import { useCallback, useState } from 'react';
import { Device, IrrigationScheduleMode, type IrrigationScheduleModeValue } from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import {
  SCHEDULE_MODES, SCHEDULE_MODE_HELP, SCHEDULE_MODE_LABELS, sortEventsByTime,
  type IrrigationScheduleEvent,
} from '@/lib/irrigation';
import { IrrigationEventRow } from './IrrigationEventRow';
import { IrrigationEventEditor } from './IrrigationEventEditor';
import { IrrigationIntervalSelect } from './IrrigationIntervalSelect';

interface IrrigationSchedulePanelProps {
  address: string;
}

/** What the editor is showing: nothing, a new event, or an existing event. */
type Editing = { event?: IrrigationScheduleEvent } | null;

/**
 * Manage a controller's watering schedules. Each mode (weekly, interval, even,
 * odd) keeps its own list of events; the mode the controller follows is
 * chosen in the Watering Mode configurator. Replaces the irrigation branch of
 * legacy `schedule/edit-panel`.
 */
export function IrrigationSchedulePanel({ address }: IrrigationSchedulePanelProps) {
  const {
    device, zones, activeMode, eventsByMode, intervalDays, subsystemAddress,
  } = useIrrigationController(address);
  const [mode, setMode] = useState<IrrigationScheduleModeValue>(activeMode ?? IrrigationScheduleMode.WEEKLY);
  const [editing, setEditing] = useState<Editing>(null);

  const name = (device?.[Device.ATTR_NAME] as string | undefined) ?? 'Irrigation Controller';
  const events = sortEventsByTime(eventsByMode[mode]);

  const handleAdd = useCallback(() => setEditing({}), []);
  const handleEdit = useCallback((event: IrrigationScheduleEvent) => setEditing({ event }), []);
  const handleClose = useCallback(() => setEditing(null), []);

  if (!device) {
    return <p data-testid="irrigation-schedule-missing" className="text-sm text-grouse">Controller not found.</p>;
  }

  return (
    <div data-testid="irrigation-schedule-panel" className="space-y-4">
      <p className="text-sm text-grouse">{name}</p>

      <div role="tablist" aria-label="Watering modes" className="flex flex-wrap gap-1">
        {SCHEDULE_MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            data-testid={`irrigation-schedule-tab-${m.toLowerCase()}`}
            data-active={activeMode === m}
            onClick={() => setMode(m)}
            disabled={editing !== null}
            className={`px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors disabled:opacity-50 ${
              mode === m ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron'
            }`}
          >
            {SCHEDULE_MODE_LABELS[m]}
            {activeMode === m && ' ✓'}
          </button>
        ))}
      </div>
      <p data-testid="irrigation-schedule-help" className="text-xs text-grouse">
        {SCHEDULE_MODE_HELP[mode]}
        {activeMode === mode ? ' This is the active schedule.' : ''}
      </p>

      {mode === IrrigationScheduleMode.INTERVAL && editing === null && (
        <IrrigationIntervalSelect address={address} subsystemAddress={subsystemAddress} days={intervalDays} />
      )}

      {editing !== null ? (
        <IrrigationEventEditor
          key={editing.event?.eventId ?? 'new'}
          address={address}
          mode={mode}
          event={editing.event}
          onClose={handleClose}
        />
      ) : (
        <>
          {events.length === 0 ? (
            <p data-testid="irrigation-schedule-empty" className="text-sm text-grouse">
              No {SCHEDULE_MODE_LABELS[mode].toLowerCase()} events. Add an event to choose watering durations and a start time.
            </p>
          ) : (
            <ul data-testid="irrigation-schedule-events">
              {events.map((event) => (
                <IrrigationEventRow key={event.eventId} event={event} zones={zones} onEdit={handleEdit} />
              ))}
            </ul>
          )}
          <button
            type="button"
            data-testid="irrigation-schedule-add"
            onClick={handleAdd}
            disabled={zones.length === 0}
            className="px-4 py-2 text-sm font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
          >
            + Add {SCHEDULE_MODE_LABELS[mode]} Event
          </button>
        </>
      )}
    </div>
  );
}
