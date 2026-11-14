'use client';

/**
 * ScheduleEditPanel — side panel for managing a device/scene/rule schedule.
 *
 * Replaces src/components/schedule/edit-panel/. Shows a calendar view
 * of existing events and allows adding/editing events.
 */

import { useState, useCallback, useMemo } from 'react';
import { Scheduler, Thermostat } from '@arcus/core';
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
import type {
  ScheduleAttributes,
  ScheduleAttributeEditorRenderer,
  ScheduledCommand,
} from './types';

const DAY_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_SHORT: { [day: string]: string } = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

/** "HH:mm:ss" → "h:mm AM". */
function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

function formatDays(days: string[]): string {
  return DAY_ORDER.filter((d) => days.includes(d)).map((d) => DAY_SHORT[d]).join(', ');
}

interface ScheduleEditPanelProps {
  targetAddress: string;
  targetName: string;
  scheduleId: string;
  messageType: string;
  modes?: string[];
  attributeEditor?: React.ReactNode;
  /** Target-specific controls for an event's attributes (e.g. thermostat setpoints). */
  renderAttributeEditor?: ScheduleAttributeEditorRenderer;
  /** Attributes a new event starts with; also fills keys missing from existing events. */
  defaultAttributes?: ScheduleAttributes;
  /** Display labels for the schedule groups in `modes`. */
  modeLabels?: { [mode: string]: string };
  /** Describes what an event does; when given, events are also listed below the calendar. */
  describeEvent?: (command: ScheduledCommand) => string;
}

export function ScheduleEditPanel({
  targetAddress,
  targetName,
  scheduleId: defaultScheduleId,
  messageType,
  modes,
  attributeEditor,
  renderAttributeEditor,
  defaultAttributes,
  modeLabels,
  describeEvent,
}: ScheduleEditPanelProps) {
  const scheduler = useAppSelector((s) => selectSchedulerByTarget(s, targetAddress));

  const [view, setView] = useState<'calendar' | 'edit'>('calendar');
  const [editingEvent, setEditingEvent] = useState<ScheduleEventData | undefined>();
  const [activeScheduleId, setActiveScheduleId] = useState(defaultScheduleId);

  const commands = scheduler?.[Scheduler.ATTR_COMMANDS] as { [id: string]: ScheduledCommand } | undefined;

  // Parse scheduler commands into events
  const events = useMemo(() => {
    if (!commands) return [];

    const parsed: ScheduleEvent[] = [];
    for (const [id, cmd] of Object.entries(commands)) {
      const sId = cmd.scheduleId ?? defaultScheduleId;
      const description = describeEvent?.({ ...cmd, scheduleId: sId });
      parsed.push({
        id,
        time: cmd.time ?? '12:00:00',
        days: cmd.days ?? [],
        scheduleId: sId,
        label: description ? `${targetName}: ${description}` : targetName,
        color: sId === Thermostat.HVACMODE_HEAT ? 'var(--color-cardinal)' : sId === Thermostat.HVACMODE_COOL ? 'var(--color-peacock)' : undefined,
      });
    }
    return parsed;
  }, [commands, defaultScheduleId, targetName, describeEvent]);

  // Events in the active schedule group, in time order, for the event list
  const activeEvents = useMemo(
    () => events
      .filter((e) => e.scheduleId === activeScheduleId)
      .sort((a, b) => a.time.localeCompare(b.time)),
    [events, activeScheduleId],
  );

  const handleEventClick = useCallback(
    (event: ScheduleEvent) => {
      const cmd = commands?.[event.id];
      setEditingEvent({
        id: event.id,
        time: event.time,
        days: event.days,
        mode: cmd?.mode ?? 'ABSOLUTE',
        offsetMinutes: cmd?.offsetMinutes ?? 0,
        scheduleId: event.scheduleId ?? defaultScheduleId,
        messageType: cmd?.messageType ?? messageType,
        attributes: { ...defaultAttributes, ...cmd?.attributes },
      });
      setView('edit');
    },
    [commands, defaultScheduleId, messageType, defaultAttributes],
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

      {/* Mode selector (for multi-mode devices like thermostats) */}
      {modes && modes.length > 1 && (
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-4 w-fit">
          {modes.map((m) => (
            <button
              key={m}
              data-testid={`schedule-group-${m.toLowerCase()}`}
              aria-pressed={activeScheduleId === m}
              disabled={view === 'edit'}
              onClick={() => setActiveScheduleId(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                activeScheduleId === m
                  ? 'bg-crane text-swift shadow-sm'
                  : 'text-grouse hover:text-coot'
              }`}
            >
              {modeLabels?.[m] ?? m}
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
          {describeEvent && activeEvents.length > 0 && (
            <ul data-testid="schedule-event-list" className="mt-4 divide-y divide-heron border border-heron rounded-[var(--border-radius-base)]">
              {activeEvents.map((evt) => (
                <li key={evt.id}>
                  <button
                    data-testid={`schedule-event-row-${evt.id}`}
                    onClick={() => handleEventClick(evt)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-pigeon/50"
                  >
                    <span className="text-sm text-swift">{formatTime(evt.time)}</span>
                    <span className="flex-1 text-xs text-grouse truncate">{formatDays(evt.days)}</span>
                    <span className="text-sm font-medium text-coot">
                      {describeEvent({ ...commands?.[evt.id], scheduleId: evt.scheduleId })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {(modes && modes.length > 1 ? activeEvents.length === 0 : events.length === 0) && (
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
          renderAttributeEditor={renderAttributeEditor}
          defaultAttributes={defaultAttributes}
        />
      )}
    </div>
  );
}
