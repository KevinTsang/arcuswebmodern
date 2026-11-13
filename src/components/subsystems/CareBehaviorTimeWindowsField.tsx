'use client';

/**
 * CareBehaviorTimeWindowsField — the days and times a care behavior is
 * monitored (`timeWindows`). No windows means the behavior runs 24/7.
 * Each window runs from a start day/time to an end day/time and may wrap
 * past the end of the week; overlapping windows are rejected.
 */

import { useCallback, useMemo, useState } from 'react';
import { buildTimeWindow, formatTimeWindow, WEEK_DAYS, type TimeWindowInput } from '@/lib/careBehaviors';
import type { CareBehaviorFieldProps } from './careBehaviorTypes';

const EMPTY_INPUT: TimeWindowInput = { startDay: 'Monday', startTime: '08:00', endDay: 'Monday', endTime: '17:00' };

export function CareBehaviorTimeWindowsField({ behavior, onChange }: CareBehaviorFieldProps) {
  const windows = useMemo(() => behavior.timeWindows ?? [], [behavior.timeWindows]);
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState<TimeWindowInput>(EMPTY_INPUT);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback((patch: Partial<TimeWindowInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
    setError(null);
  }, []);

  const handleAdd = useCallback(() => {
    const result = buildTimeWindow(input, windows);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    onChange({ timeWindows: [...windows, result.window] });
    setAdding(false);
    setInput(EMPTY_INPUT);
  }, [input, windows, onChange]);

  const handleCancel = useCallback(() => {
    setAdding(false);
    setInput(EMPTY_INPUT);
    setError(null);
  }, []);

  const handleRemove = useCallback((index: number) => {
    onChange({ timeWindows: windows.filter((_, i) => i !== index) });
  }, [windows, onChange]);

  const controlClass = 'text-sm border border-heron rounded px-2 py-1 bg-crane text-swift';

  return (
    <div className="space-y-2">
      {windows.length === 0 && !adding && (
        <p data-testid="care-field-windows-always" className="text-xs text-grouse">Monitored 24/7.</p>
      )}
      {windows.map((window, i) => (
        <div key={`${window.day}-${window.startTime}`} data-testid={`care-window-${i}`} className="flex items-center justify-between px-3 py-1.5 rounded border border-heron">
          <span className="text-sm text-swift">{formatTimeWindow(window)}</span>
          <button
            type="button"
            data-testid={`care-window-remove-${i}`}
            onClick={() => handleRemove(i)}
            className="text-xs text-cardinal hover:underline"
          >
            Remove
          </button>
        </div>
      ))}

      {adding ? (
        <div className="space-y-2 p-3 rounded border border-heron bg-pigeon/30">
          <div className="flex flex-wrap items-center gap-2 text-sm text-coot">
            <span className="w-10">From</span>
            <select aria-label="Start day" data-testid="care-window-start-day" value={input.startDay} onChange={(e) => update({ startDay: e.target.value })} className={controlClass}>
              {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="time" aria-label="Start time" data-testid="care-window-start-time" value={input.startTime} onChange={(e) => update({ startTime: e.target.value })} className={controlClass} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-coot">
            <span className="w-10">To</span>
            <select aria-label="End day" data-testid="care-window-end-day" value={input.endDay} onChange={(e) => update({ endDay: e.target.value })} className={controlClass}>
              {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <input type="time" aria-label="End time" data-testid="care-window-end-time" value={input.endTime} onChange={(e) => update({ endTime: e.target.value })} className={controlClass} />
          </div>
          {error && <p data-testid="care-window-error" className="text-xs text-cardinal">{error}</p>}
          <div className="flex gap-2">
            <button type="button" data-testid="care-window-save" onClick={handleAdd} className="bg-peacock text-crane px-3 py-1 rounded-[var(--border-radius-base)] text-xs hover:opacity-90">
              Add
            </button>
            <button type="button" data-testid="care-window-cancel" onClick={handleCancel} className="border border-heron px-3 py-1 rounded-[var(--border-radius-base)] text-xs text-coot hover:bg-pigeon">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" data-testid="care-window-add" onClick={() => setAdding(true)} className="text-xs text-peacock hover:underline">
          + Add Event
        </button>
      )}
    </div>
  );
}
