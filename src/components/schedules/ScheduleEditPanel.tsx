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
}

export function ScheduleEditPanel({
  targetAddress,
  targetName,
  scheduleId: defaultScheduleId,
  messageType,
  modes,
  attributeEditor,
}: ScheduleEditPanelProps) {
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
      parsed.push({
        id,
        time: (cmd['time'] as string) ?? '12:00:00',
        days: (cmd['days'] as string[]) ?? [],
        scheduleId: sId,
        label: targetName,
        color: sId === Thermostat.HVACMODE_HEAT ? 'var(--color-cardinal)' : sId === Thermostat.HVACMODE_COOL ? 'var(--color-peacock)' : undefined,
      });
    }
    return parsed;
  }, [scheduler, defaultScheduleId, targetName]);

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
      <h3 data-testid="schedule-title" className="text-lg font-semibold text-swift mb-1">Schedule</h3>
      <p className="text-sm text-grouse mb-4">{targetName}</p>

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
        />
      )}
    </div>
  );
}
