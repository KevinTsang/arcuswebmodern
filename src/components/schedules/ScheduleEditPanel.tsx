'use client';

/**
 * ScheduleEditPanel — side panel for managing a device/scene/rule schedule.
 *
 * Replaces src/components/schedule/edit-panel/. Shows a calendar view
 * of existing events and allows adding/editing events.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Thermostat } from '@arcus/core';
import { SchedulerService } from '@arcus/core/services';
import { useAppSelector } from '@/store/hooks';
import { selectSchedulerByTarget } from '@/store/slices/schedulersSlice';
import { useScheduleTimezone } from '@/hooks/useScheduleTimezone';
import type { ScheduleMessageTypeOption } from './types';
import {
  ScheduleCalendar,
  type ScheduleEvent,
} from './ScheduleCalendar';
import {
  ScheduleEventEditor,
  type ScheduleEventData,
} from './ScheduleEventEditor';

interface ScheduleEditPanelProps {
  targetAddress: string;
  targetName: string;
  scheduleId: string;
  messageType: string;
  modes?: string[];
  attributeEditor?: React.ReactNode;
  /** Commands an event can send (e.g. rule Active / Inactive); labels calendar events. */
  messageTypeOptions?: ScheduleMessageTypeOption[];
  /** Short guidance shown above the calendar. */
  instructions?: string;
}

export function ScheduleEditPanel({
  targetAddress,
  targetName,
  scheduleId: defaultScheduleId,
  messageType,
  modes,
  attributeEditor,
  messageTypeOptions,
  instructions,
}: ScheduleEditPanelProps) {
  const { converts, toLocal, localTimeZone, placeTimeZoneName } = useScheduleTimezone();
  const scheduler = useAppSelector((s) => selectSchedulerByTarget(s, targetAddress));

  const [view, setView] = useState<'calendar' | 'edit'>('calendar');
  const [editingEvent, setEditingEvent] = useState<ScheduleEventData | undefined>();
  const [activeScheduleId, setActiveScheduleId] = useState(defaultScheduleId);

  // Parse scheduler commands into events
  const events = useMemo(() => {
    if (!scheduler) return [];
    const commands = scheduler['scheduler:commands'] as Record<string, Record<string, unknown>> | undefined;
    if (!commands) return [];

    const parsed: ScheduleEvent[] = [];
    for (const [id, cmd] of Object.entries(commands)) {
      const sId = (cmd['scheduleId'] as string) ?? defaultScheduleId;
      const option = messageTypeOptions?.find((o) => o.value === cmd['messageType']);
      const placeTime = (cmd['time'] as string) ?? '12:00:00';
      const placeDays = (cmd['days'] as string[]) ?? [];
      // Absolute times are stored in place time; show them in the viewer's.
      const isAbsolute = (cmd['mode'] ?? 'ABSOLUTE') === 'ABSOLUTE';
      const { time, days } = isAbsolute
        ? toLocal(placeTime, placeDays)
        : { time: placeTime, days: placeDays };
      const modeColor = sId === Thermostat.HVACMODE_HEAT ? 'var(--color-cardinal)' : sId === Thermostat.HVACMODE_COOL ? 'var(--color-peacock)' : undefined;
      parsed.push({
        id,
        time,
        days,
        scheduleId: sId,
        label: option ? `${targetName}: ${option.label}` : targetName,
        color: option?.inactive ? 'var(--color-grouse)' : modeColor,
      });
    }
    return parsed;
  }, [scheduler, defaultScheduleId, targetName, messageTypeOptions, toLocal]);

  const handleEventClick = useCallback(
    (event: ScheduleEvent) => {
      const commands = scheduler?.['scheduler:commands'] as Record<string, Record<string, unknown>> | undefined;
      const cmd = commands?.[event.id];
      setEditingEvent({
        id: event.id,
        time: event.time,
        days: event.days,
        mode: (cmd?.['mode'] as 'ABSOLUTE' | 'SUNRISE' | 'SUNSET') ?? 'ABSOLUTE',
        offsetMinutes: (cmd?.['offsetMinutes'] as number) ?? 0,
        scheduleId: event.scheduleId ?? defaultScheduleId,
        messageType: (cmd?.['messageType'] as string) ?? messageType,
        attributes: (cmd?.['attributes'] as Record<string, unknown>) ?? {},
      });
      setView('edit');
    },
    [scheduler, defaultScheduleId, messageType],
  );

  const handleAddNew = useCallback(() => {
    setEditingEvent(undefined);
    setView('edit');
  }, []);

  const handleSaveOrDelete = useCallback(() => {
    setView('calendar');
    setEditingEvent(undefined);
  }, []);

  return (
    <div>
      <p data-testid="schedule-target" className="text-sm text-grouse mb-4">{targetName}</p>

      {instructions && (
        <p data-testid="schedule-instructions" className="text-sm text-coot mb-4">{instructions}</p>
      )}

      {converts && (
        <p data-testid="schedule-timezone-note" className="text-xs text-grouse mb-4">
          Times are shown in your time zone ({localTimeZone}). This place is in {placeTimeZoneName}.
        </p>
      )}

      {/* Mode selector (for multi-mode devices like thermostats) */}
      {modes && modes.length > 1 && (
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-4 w-fit">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => setActiveScheduleId(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeScheduleId === m
                  ? 'bg-crane text-swift shadow-sm'
                  : 'text-grouse hover:text-coot'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {view === 'calendar' ? (
        <>
          <ScheduleCalendar
            events={events}
            scheduleId={activeScheduleId}
            onEventClick={handleEventClick}
          />
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddNew}
              data-testid="schedule-add-event"
              className="flex-1 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
            >
              Add Event
            </button>
          </div>
          {events.length === 0 && (
            <p data-testid="schedule-empty" className="text-center text-sm text-grouse mt-4">
              No events scheduled.
            </p>
          )}
        </>
      ) : (
        <ScheduleEventEditor
          target={targetAddress}
          scheduleId={activeScheduleId}
          messageType={messageType}
          event={editingEvent}
          onSave={handleSaveOrDelete}
          onCancel={() => setView('calendar')}
          onDelete={handleSaveOrDelete}
          attributeEditor={attributeEditor}
          messageTypeOptions={messageTypeOptions}
        />
      )}
    </div>
  );
}
