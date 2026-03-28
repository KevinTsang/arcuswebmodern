'use client';

/**
 * ScheduleCalendar — weekly calendar view for scheduled events.
 *
 * Replaces src/components/schedule/calendar/. Displays events
 * positioned by time of day across 7 day columns.
 */

import { useMemo } from 'react';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TIME_LABELS = [
  { label: '12 AM', pct: 0 },
  { label: '6 AM', pct: 25 },
  { label: '12 PM', pct: 50 },
  { label: '6 PM', pct: 75 },
];

export interface ScheduleEvent {
  id: string;
  time: string; // "HH:mm:00"
  days: string[];
  scheduleId?: string;
  label?: string;
  color?: string;
}

interface ScheduleCalendarProps {
  events: ScheduleEvent[];
  scheduleId?: string;
  onEventClick?: (event: ScheduleEvent) => void;
}

function timeToPercent(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return ((h * 60 + m) / 1440) * 100;
}

export function ScheduleCalendar({ events, scheduleId, onEventClick }: ScheduleCalendarProps) {
  const filtered = useMemo(() => {
    if (!scheduleId) return events;
    return events.filter((e) => e.scheduleId === scheduleId);
  }, [events, scheduleId]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    for (const day of DAYS) map[day] = [];
    for (const evt of filtered) {
      for (const day of evt.days) {
        if (map[day]) map[day].push(evt);
      }
    }
    return map;
  }, [filtered]);

  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] bg-pigeon/30 border-b border-heron">
        <div className="p-2 text-xs text-grouse" />
        {DAY_LABELS.map((label) => (
          <div key={label} className="p-2 text-xs text-center font-medium text-swift">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar body */}
      <div className="grid grid-cols-[48px_repeat(7,1fr)] relative" style={{ height: 200 }}>
        {/* Time labels */}
        <div className="relative">
          {TIME_LABELS.map((t) => (
            <div
              key={t.label}
              className="absolute left-0 right-0 text-[10px] text-grouse px-1"
              style={{ top: `${t.pct}%` }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {DAYS.map((day) => (
          <div key={day} className="relative border-l border-heron">
            {/* Grid lines */}
            {TIME_LABELS.map((t) => (
              <div
                key={t.label}
                className="absolute left-0 right-0 border-t border-heron/50"
                style={{ top: `${t.pct}%` }}
              />
            ))}
            {/* Events */}
            {eventsByDay[day]?.map((evt) => {
              const top = timeToPercent(evt.time);
              return (
                <button
                  key={evt.id}
                  onClick={() => onEventClick?.(evt)}
                  className="absolute left-0.5 right-0.5 h-2 rounded-full cursor-pointer hover:opacity-80"
                  style={{
                    top: `${top}%`,
                    backgroundColor: evt.color ?? 'var(--color-peacock)',
                  }}
                  title={`${evt.label ?? 'Event'} at ${evt.time}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
