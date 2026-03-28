'use client';

/**
 * ScheduleEventEditor — create/edit scheduled events.
 *
 * Replaces src/components/schedule/event/. Provides time picker,
 * mode selector (ABSOLUTE/SUNRISE/SUNSET), day checkboxes, and
 * device-specific attribute controls.
 */

import { useState, useCallback } from 'react';
import { SchedulerService } from '@arcus/core/services';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
const DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

type TimeMode = 'ABSOLUTE' | 'SUNRISE' | 'SUNSET';

export interface ScheduleEventData {
  id?: string;
  time: string;
  days: string[];
  mode: TimeMode;
  offsetMinutes: number;
  scheduleId: string;
  messageType: string;
  attributes: Record<string, unknown>;
}

interface ScheduleEventEditorProps {
  target: string; // device/scene/rule address
  scheduleId: string;
  messageType: string;
  event?: ScheduleEventData;
  onSave?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
  attributeEditor?: React.ReactNode;
}

export function ScheduleEventEditor({
  target,
  scheduleId,
  messageType,
  event,
  onSave,
  onCancel,
  onDelete,
  attributeEditor,
}: ScheduleEventEditorProps) {
  const dispatch = useAppDispatch();
  const isEditing = !!event?.id;

  const [time, setTime] = useState(event?.time ?? '12:00:00');
  const [mode, setMode] = useState<TimeMode>(event?.mode ?? 'ABSOLUTE');
  const [offsetMinutes, setOffsetMinutes] = useState(event?.offsetMinutes ?? 0);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(
    new Set(event?.days ?? ['MON', 'TUE', 'WED', 'THU', 'FRI']),
  );
  const [attributes, setAttributes] = useState<Record<string, unknown>>(event?.attributes ?? {});
  const [saving, setSaving] = useState(false);

  // Parse time into hour/minute/ampm
  const [h, m] = time.split(':').map(Number);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const isPM = h >= 12;

  const setHour = useCallback((val: number) => {
    const hour24 = isPM ? (val === 12 ? 12 : val + 12) : (val === 12 ? 0 : val);
    setTime(`${String(hour24).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  }, [isPM, m]);

  const setMinute = useCallback((val: number) => {
    setTime(`${String(h).padStart(2, '0')}:${String(val).padStart(2, '0')}:00`);
  }, [h]);

  const toggleAMPM = useCallback(() => {
    const newH = isPM ? h - 12 : h + 12;
    setTime(`${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  }, [isPM, h, m]);

  const toggleDay = useCallback((day: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (selectedDays.size === 0) {
      dispatch(addNotification({ type: 'warning', message: 'Select at least one day.' }));
      return;
    }
    setSaving(true);
    try {
      const days = Array.from(selectedDays);
      if (isEditing && event?.id) {
        await SchedulerService.UpdateWeeklyCommand(
          target, scheduleId, event.id, days, mode,
          mode === 'ABSOLUTE' ? time : undefined,
          mode !== 'ABSOLUTE' ? offsetMinutes : undefined,
          messageType, attributes,
        );
      } else {
        await SchedulerService.ScheduleWeeklyCommand(
          target, scheduleId, days, mode,
          mode === 'ABSOLUTE' ? time : undefined,
          mode !== 'ABSOLUTE' ? offsetMinutes : undefined,
          messageType, attributes,
        );
      }
      dispatch(addNotification({ type: 'success', message: isEditing ? 'Event updated.' : 'Event created.' }));
      onSave?.();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save event.' }));
    } finally {
      setSaving(false);
    }
  }, [target, scheduleId, messageType, event, selectedDays, mode, time, offsetMinutes, attributes, isEditing, dispatch, onSave]);

  const handleDelete = useCallback(async () => {
    if (!event?.id || !window.confirm('Delete this scheduled event?')) return;
    setSaving(true);
    try {
      await SchedulerService.DeleteCommand(target, scheduleId, event.id);
      dispatch(addNotification({ type: 'success', message: 'Event deleted.' }));
      onDelete?.();
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to delete event.' }));
    } finally {
      setSaving(false);
    }
  }, [target, scheduleId, event, dispatch, onDelete]);

  return (
    <div className="space-y-5">
      {/* Time mode */}
      <div>
        <label className="block text-sm font-medium text-swift mb-2">Time</label>
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1 mb-3 w-fit">
          {(['ABSOLUTE', 'SUNRISE', 'SUNSET'] as TimeMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                mode === m ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'
              }`}
            >
              {m === 'ABSOLUTE' ? 'Time' : m === 'SUNRISE' ? 'Sunrise' : 'Sunset'}
            </button>
          ))}
        </div>

        {mode === 'ABSOLUTE' ? (
          <div className="flex items-center gap-2">
            <select
              value={hour12}
              onChange={(e) => setHour(Number(e.target.value))}
              className="border border-heron rounded px-2 py-1.5 text-sm text-swift"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="text-swift">:</span>
            <select
              value={m}
              onChange={(e) => setMinute(Number(e.target.value))}
              className="border border-heron rounded px-2 py-1.5 text-sm text-swift"
            >
              {Array.from({ length: 60 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{String(n).padStart(2, '0')}</option>
              ))}
            </select>
            <button
              onClick={toggleAMPM}
              className="px-3 py-1.5 border border-heron rounded text-sm text-swift hover:bg-pigeon"
            >
              {isPM ? 'PM' : 'AM'}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={Math.abs(offsetMinutes)}
              onChange={(e) => {
                const val = Math.abs(Number(e.target.value));
                setOffsetMinutes(offsetMinutes < 0 ? -val : val);
              }}
              className="w-20 border border-heron rounded px-2 py-1.5 text-sm text-swift"
              min={0}
              max={120}
            />
            <span className="text-sm text-grouse">minutes</span>
            <div className="flex gap-1">
              <button
                onClick={() => setOffsetMinutes(-Math.abs(offsetMinutes || 30))}
                className={`px-2 py-1 rounded text-xs ${
                  offsetMinutes < 0 ? 'bg-peacock text-crane' : 'border border-heron text-coot'
                }`}
              >
                Before
              </button>
              <button
                onClick={() => setOffsetMinutes(Math.abs(offsetMinutes || 30))}
                className={`px-2 py-1 rounded text-xs ${
                  offsetMinutes >= 0 ? 'bg-peacock text-crane' : 'border border-heron text-coot'
                }`}
              >
                After
              </button>
            </div>
            <span className="text-sm text-grouse">{mode === 'SUNRISE' ? 'sunrise' : 'sunset'}</span>
          </div>
        )}
      </div>

      {/* Days */}
      <div>
        <label className="block text-sm font-medium text-swift mb-2">Repeat Days</label>
        <div className="flex gap-1">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => toggleDay(day)}
              className={`w-10 h-10 rounded-full text-xs font-medium transition-colors ${
                selectedDays.has(day)
                  ? 'bg-peacock text-crane'
                  : 'border border-heron text-grouse hover:border-peacock'
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>
      </div>

      {/* Device-specific attributes */}
      {attributeEditor}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isEditing ? 'Update' : 'Create'}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
          >
            Cancel
          </button>
        )}
        {isEditing && (
          <button
            onClick={handleDelete}
            disabled={saving}
            className="px-4 py-2 text-sm text-cardinal hover:underline disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
