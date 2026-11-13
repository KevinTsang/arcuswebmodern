'use client';

import { useCallback, useState, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import {
  IRRIGATION_ERROR_HAS_OVERLAPS, IrrigationScheduleMode, LawnNGardenSubsystem,
  type IrrigationScheduleModeValue,
} from '@arcus/core';
import { useIrrigationController } from '@/hooks/useIrrigationController';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  WATERING_DURATIONS, WEEK_DAYS, WEEK_DAY_LABELS, formatWateringDuration, toTimeInputValue,
  type IrrigationScheduleEvent, type IrrigationZoneDuration, type IrrigationZoneInfo,
} from '@/lib/irrigation';

interface IrrigationEventEditorProps {
  address: string;
  mode: IrrigationScheduleModeValue;
  /** The event to edit; omitted when adding a new event. */
  event?: IrrigationScheduleEvent;
  onClose: () => void;
}

/** Platform error shape a rejected Bridge request carries. */
interface PlatformError {
  code?: string;
}

const OVERLAP_MESSAGE =
  'You currently have an event scheduled that overlaps with the start time you have chosen. Please select a different time.';

const SELECT_CLASS = 'border border-heron rounded-[var(--border-radius-base)] bg-crane px-2 py-1 text-sm text-swift';

function initialZones(event: IrrigationScheduleEvent | undefined, zones: IrrigationZoneInfo[]): IrrigationZoneDuration[] {
  if (event) return (event.events ?? []).map((t) => ({ zone: t.zone, duration: t.duration }));
  // A single-zone controller (e.g. a hose timer) always waters its only zone.
  if (zones.length === 1) return [{ zone: zones[0].zone, duration: zones[0].defaultDuration }];
  return [];
}

function currentHour(): string {
  return `${String(new Date().getHours()).padStart(2, '0')}:00`;
}

/** Duration choices, keeping a value set elsewhere that isn't in the standard list. */
function durationOptions(current: number): number[] {
  return WATERING_DURATIONS.includes(current)
    ? WATERING_DURATIONS
    : [...WATERING_DURATIONS, current].sort((a, b) => a - b);
}

/**
 * Add, edit or delete one watering event: which zones water, in what order and
 * for how long, the start time, and — for weekly schedules — which days.
 * Replaces legacy `schedule/irrigation-event`.
 */
export function IrrigationEventEditor({ address, mode, event, onClose }: IrrigationEventEditorProps) {
  const {
    zones, subsystemAddress, activeMode, eventsByMode, intervalDays, intervalConfigured,
  } = useIrrigationController(address);
  const dispatch = useAppDispatch();
  const isWeekly = mode === IrrigationScheduleMode.WEEKLY;

  const [scheduled, setScheduled] = useState<IrrigationZoneDuration[]>(() => initialZones(event, zones));
  const [time, setTime] = useState(() => (event ? toTimeInputValue(event.timeOfDay) : currentHour()));
  const [days, setDays] = useState<string[]>(() => event?.days ?? []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const zoneName = useCallback(
    (zone: string) => zones.find((z) => z.zone === zone)?.name ?? zone,
    [zones],
  );
  const omitted = zones.filter((z) => !scheduled.some((s) => s.zone === z.zone));
  const allSelected = zones.length > 0 && omitted.length === 0;

  const zonesError = scheduled.length === 0;
  const daysError = isWeekly && days.length === 0;
  const timeError = !time;
  const invalid = zonesError || daysError || timeError;

  const handleSelectZone = useCallback((zone: IrrigationZoneInfo) => {
    setScheduled((prev) => [...prev, { zone: zone.zone, duration: zone.defaultDuration }]);
  }, []);

  const handleDeselectZone = useCallback((zone: string) => {
    setScheduled((prev) => prev.filter((s) => s.zone !== zone));
  }, []);

  const handleToggleAll = useCallback(() => {
    setScheduled((prev) => (allSelected
      ? []
      : [...prev, ...omitted.map((z) => ({ zone: z.zone, duration: z.defaultDuration }))]));
  }, [allSelected, omitted]);

  const handleDuration = useCallback((zone: string, duration: number) => {
    setScheduled((prev) => prev.map((s) => (s.zone === zone ? { ...s, duration } : s)));
  }, []);

  const handleMove = useCallback((index: number, offset: -1 | 1) => {
    setScheduled((prev) => {
      const target = index + offset;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const handleToggleDay = useCallback((day: string) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }, []);

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (invalid || !subsystemAddress) return;
    setSaving(true);
    const timeOfDay = `${time}:00`;
    const controller = address;
    try {
      if (isWeekly) {
        if (event) {
          await Bridge.request(LawnNGardenSubsystem.CMD_UPDATEWEEKLYEVENT, subsystemAddress, {
            controller, eventId: event.eventId, days, timeOfDay, zoneDurations: scheduled,
          });
        } else {
          await Bridge.request(LawnNGardenSubsystem.CMD_CREATEWEEKLYEVENT, subsystemAddress, {
            controller, days, timeOfDay, zoneDurations: scheduled,
          });
        }
      } else {
        // An interval schedule needs its day count before events can be added.
        if (mode === IrrigationScheduleMode.INTERVAL && !intervalConfigured) {
          await Bridge.request(LawnNGardenSubsystem.CMD_CONFIGUREINTERVALSCHEDULE, subsystemAddress, {
            controller, startTime: Date.now(), days: intervalDays,
          });
        }
        if (event) {
          await Bridge.request(LawnNGardenSubsystem.CMD_UPDATESCHEDULEEVENT, subsystemAddress, {
            controller, mode, eventId: event.eventId, timeOfDay, zoneDurations: scheduled,
          });
        } else {
          await Bridge.request(LawnNGardenSubsystem.CMD_CREATESCHEDULEEVENT, subsystemAddress, {
            controller, mode, timeOfDay, zoneDurations: scheduled,
          });
        }
      }
      dispatch(addNotification({ type: 'success', message: `Your event has been ${event ? 'updated' : 'created'}.` }));
      onClose();
    } catch (err) {
      setSaving(false);
      const message = (err as PlatformError | undefined)?.code === IRRIGATION_ERROR_HAS_OVERLAPS
        ? OVERLAP_MESSAGE
        : `Failed to ${event ? 'update' : 'create'} the event. Please try again later.`;
      dispatch(addNotification({ type: 'error', message }));
    }
  }, [
    invalid, subsystemAddress, time, address, isWeekly, event, days, scheduled, mode,
    intervalConfigured, intervalDays, dispatch, onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!event || !subsystemAddress) return;
    setDeleting(true);
    const controller = address;
    // Removing the last event of the mode being followed leaves nothing to
    // run, so fall back to manual watering as the legacy client does.
    const disableAfter = activeMode === mode && eventsByMode[mode].length === 1;
    try {
      if (isWeekly) {
        await Bridge.request(LawnNGardenSubsystem.CMD_REMOVEWEEKLYEVENT, subsystemAddress, {
          controller, eventId: event.eventId,
        });
      } else {
        await Bridge.request(LawnNGardenSubsystem.CMD_REMOVESCHEDULEEVENT, subsystemAddress, {
          controller, mode, eventId: event.eventId,
        });
      }
      if (disableAfter) {
        await Bridge.request(LawnNGardenSubsystem.CMD_DISABLESCHEDULING, subsystemAddress, { controller });
      }
      onClose();
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to delete the event. Please try again later.' }));
    }
  }, [event, subsystemAddress, address, activeMode, mode, eventsByMode, isWeekly, onClose, dispatch]);

  const handleConfirmDelete = useCallback(() => setConfirmingDelete(true), []);
  const handleCancelDelete = useCallback(() => setConfirmingDelete(false), []);

  return (
    <form onSubmit={handleSave} data-testid="irrigation-event-editor" className="space-y-4">
      <div>
        <p className="text-sm font-medium text-swift">
          {zones.length > 1 ? 'Select Zones and Adjust Durations' : 'Select Duration'}
        </p>
        <p className="text-xs text-grouse">
          Add more events if you want to water {zones.length > 1 ? 'the same zones ' : ''}multiple times a day.
        </p>
      </div>

      {zones.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-swift">
          <input type="checkbox" data-testid="irrigation-event-select-all" checked={allSelected} onChange={handleToggleAll} />
          Select All
        </label>
      )}

      <ul className="space-y-2">
        {scheduled.map((s, index) => (
          <li key={s.zone} data-testid={`irrigation-event-zone-${s.zone}`} data-selected="true" className="flex items-center gap-2">
            {zones.length > 1 ? (
              <label className="flex flex-1 items-center gap-2 text-sm text-swift min-w-0">
                <input
                  type="checkbox"
                  data-testid={`irrigation-event-zone-toggle-${s.zone}`}
                  checked
                  onChange={() => handleDeselectZone(s.zone)}
                />
                <span className="truncate">{zoneName(s.zone)}</span>
              </label>
            ) : (
              <span className="flex-1 text-sm text-swift truncate">{zoneName(s.zone)}</span>
            )}
            <select
              aria-label={`Duration for ${zoneName(s.zone)}`}
              data-testid={`irrigation-event-zone-duration-${s.zone}`}
              value={s.duration}
              onChange={(e) => handleDuration(s.zone, Number(e.target.value))}
              className={SELECT_CLASS}
            >
              {durationOptions(s.duration).map((d) => (
                <option key={d} value={d}>{formatWateringDuration(d)}</option>
              ))}
            </select>
            {scheduled.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label={`Move ${zoneName(s.zone)} earlier`}
                  data-testid={`irrigation-event-zone-up-${s.zone}`}
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="px-1 text-coot disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${zoneName(s.zone)} later`}
                  data-testid={`irrigation-event-zone-down-${s.zone}`}
                  onClick={() => handleMove(index, 1)}
                  disabled={index === scheduled.length - 1}
                  className="px-1 text-coot disabled:opacity-30"
                >
                  ▼
                </button>
              </>
            )}
          </li>
        ))}
        {omitted.map((z) => (
          <li key={z.zone} data-testid={`irrigation-event-zone-${z.zone}`} data-selected="false" className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 text-sm text-grouse">
              <input
                type="checkbox"
                data-testid={`irrigation-event-zone-toggle-${z.zone}`}
                checked={false}
                onChange={() => handleSelectZone(z)}
              />
              {z.name}
            </label>
          </li>
        ))}
      </ul>
      {zonesError && (
        <p data-testid="irrigation-event-zones-error" className="text-xs text-cardinal">At least one zone must be selected.</p>
      )}

      <label className="block">
        <span className="text-sm font-medium text-swift">Start Time</span>
        <input
          type="time"
          data-testid="irrigation-event-time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className={`mt-1 block ${SELECT_CLASS}`}
        />
      </label>

      {isWeekly && (
        <div>
          <p className="text-sm font-medium text-swift mb-1">Repeat On</p>
          <div className="flex flex-wrap gap-1">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                data-testid={`irrigation-event-day-${day}`}
                aria-pressed={days.includes(day)}
                onClick={() => handleToggleDay(day)}
                className={`px-2 py-1 text-xs rounded-[var(--border-radius-base)] ${
                  days.includes(day) ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron'
                }`}
              >
                {WEEK_DAY_LABELS[day]}
              </button>
            ))}
          </div>
          {daysError && (
            <p data-testid="irrigation-event-days-error" className="text-xs text-cardinal mt-1">At least one day must be selected.</p>
          )}
        </div>
      )}

      {confirmingDelete ? (
        <div data-testid="irrigation-event-confirm-delete" className="space-y-2">
          <p className="text-sm text-cardinal">Are you sure you want to delete this event?</p>
          <div className="flex gap-2">
            <button
              type="button"
              data-testid="irrigation-event-delete-confirm"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 text-sm font-medium bg-cardinal text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete Event'}
            </button>
            <button
              type="button"
              data-testid="irrigation-event-delete-cancel"
              onClick={handleCancelDelete}
              className="px-4 py-2 text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] hover:bg-heron"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="submit"
            data-testid="irrigation-event-save"
            disabled={saving || invalid || !subsystemAddress}
            className="px-4 py-2 text-sm font-medium bg-peacock text-crane rounded-[var(--border-radius-base)] disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            data-testid="irrigation-event-cancel"
            onClick={onClose}
            className="px-4 py-2 text-sm text-coot bg-pigeon rounded-[var(--border-radius-base)] hover:bg-heron"
          >
            Cancel
          </button>
          {event && (
            <button
              type="button"
              data-testid="irrigation-event-delete"
              onClick={handleConfirmDelete}
              className="ml-auto px-3 py-2 text-sm text-cardinal hover:underline"
            >
              Delete Event
            </button>
          )}
        </div>
      )}
    </form>
  );
}
