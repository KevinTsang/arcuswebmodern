/**
 * Care behavior helpers — template normalization, new-behavior defaults,
 * field summaries and time-window math shared by the care behavior editor.
 *
 * Mirrors the legacy client's `care.js#transformTemplate`,
 * `config/care-behaviors.json` and `helpers/behavior.js`.
 */

import type { CareBehavior, CareTimeWindow } from '@/store/entityTypes';
import { cToF } from '@/hooks/useDeviceConfig';

// ── Platform types ────────────────────────────────────────────────────

/** A per-field string map on a raw template (labels, descriptions, values, units). */
interface TemplateFieldMap {
  [field: string]: string | null | undefined;
}

/** Raw `CareBehaviorTemplate` returned by `subcare:ListBehaviorTemplates`. */
export interface CareBehaviorTemplateData {
  id: string;
  name: string;
  description?: string;
  type?: string;
  timeWindowSupport?: string;
  availableDevices?: string[];
  fieldLabels?: TemplateFieldMap;
  fieldDescriptions?: TemplateFieldMap;
  fieldValues?: TemplateFieldMap;
  fieldUnits?: TemplateFieldMap;
}

export interface ListBehaviorTemplatesResponse {
  behaviorTemplates?: CareBehaviorTemplateData[];
}

export interface ListBehaviorsResponse {
  behaviors?: CareBehavior[];
}

// ── Normalized template ───────────────────────────────────────────────

/** Editable field kinds the web UI renders an editor for. */
export type CareFieldKey =
  | 'devices'
  | 'devicesOpenCount'
  | 'duration'
  | 'temperatureRange'
  | 'time'
  | 'timeWindows';

export interface CareTemplateField {
  key: CareFieldKey;
  label: string;
  description: string;
  /** Selectable values, e.g. durations ["30","60"] or a range ["20","105"]. */
  values: string[];
  unit: string | null;
}

export interface CareTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  availableDevices: string[];
  /** Fields in display order. */
  fields: CareTemplateField[];
}

export const BEHAVIOR_TYPE_OPEN_COUNT = 'OPEN_COUNT';
export const TIME_WINDOW_UNIT_NODURATION = 'NODURATION';

export const MAX_BEHAVIOR_NAME_LENGTH = 36;
export const DEFAULT_OPEN_COUNT = 5;
export const DEFAULT_CURFEW_TIME = '21:00:00';
export const DEFAULT_LOW_TEMP_C = 18.3;
export const DEFAULT_HIGH_TEMP_C = 20;
/** Minimum gap (°F) between the low and high temperature. */
export const MIN_TEMP_GAP_F = 3;
const OPEN_COUNT_VALUES = Array.from({ length: 50 }, (_, i) => String(i + 1));

const FIELD_ORDER: CareFieldKey[] = ['devices', 'devicesOpenCount', 'duration', 'temperatureRange', 'time', 'timeWindows'];

function fieldKeyFor(raw: string, template: CareBehaviorTemplateData): CareFieldKey | null {
  if (raw === 'lowTemp' || raw === 'highTemp') return 'temperatureRange';
  if (raw === 'timeWindows') {
    return template.fieldUnits?.timeWindows === TIME_WINDOW_UNIT_NODURATION ? 'time' : 'timeWindows';
  }
  if (raw === 'devices') return template.type === BEHAVIOR_TYPE_OPEN_COUNT ? 'devicesOpenCount' : 'devices';
  if (raw === 'duration') return 'duration';
  return null;
}

/**
 * Collapse the platform's parallel `fieldLabels` / `fieldDescriptions` /
 * `fieldValues` / `fieldUnits` maps into one list of fields.
 */
export function transformTemplate(template: CareBehaviorTemplateData): CareTemplate {
  const rawKeys = new Set<string>([
    ...Object.keys(template.fieldLabels ?? {}),
    ...Object.keys(template.fieldDescriptions ?? {}),
    ...Object.keys(template.fieldValues ?? {}),
    ...Object.keys(template.fieldUnits ?? {}),
  ]);

  const fields = new Map<CareFieldKey, CareTemplateField>();
  for (const raw of rawKeys) {
    const key = fieldKeyFor(raw, template);
    if (!key || fields.has(key)) continue;
    const value = template.fieldValues?.[raw];
    fields.set(key, {
      key,
      label: template.fieldLabels?.[raw] ?? '',
      description: template.fieldDescriptions?.[raw] ?? '',
      values: value ? value.split(/[-,]/).map((v) => v.trim()).filter(Boolean) : [],
      unit: template.fieldUnits?.[raw] ?? null,
    });
  }

  const temperature = fields.get('temperatureRange');
  if (temperature) {
    temperature.label = 'Temperature Range';
    temperature.description = 'Choose the temperature range that you want to monitor.';
  }
  const openCount = fields.get('devicesOpenCount');
  if (openCount) openCount.values = OPEN_COUNT_VALUES;

  return {
    id: template.id,
    name: template.name,
    description: template.description ?? '',
    type: template.type ?? '',
    availableDevices: template.availableDevices ?? [],
    fields: FIELD_ORDER.flatMap((k) => fields.get(k) ?? []),
  };
}

export function templateField(template: CareTemplate, key: CareFieldKey): CareTemplateField | undefined {
  return template.fields.find((f) => f.key === key);
}

// ── Durations ─────────────────────────────────────────────────────────

const UNIT_SECONDS: { [unit: string]: number } = {
  SECONDS: 1,
  MINUTES: 60,
  HOURS: 3600,
  DAYS: 86400,
};

function unitSeconds(unit: string | null): number {
  return UNIT_SECONDS[(unit ?? 'SECONDS').toUpperCase()] ?? 1;
}

export function durationToSeconds(value: string, unit: string | null): number {
  return parseInt(value, 10) * unitSeconds(unit);
}

/** "30 Minutes", "1 Day", "2 Hours". */
export function formatDurationValue(value: number, unit: string | null): string {
  const name = (unit ?? 'SECONDS').toLowerCase();
  const label = name.charAt(0).toUpperCase() + name.slice(1);
  return `${value} ${value === 1 ? label.replace(/s$/, '') : label}`;
}

/** Format a duration in seconds in the template's unit. */
export function formatDurationSecs(secs: number, unit: string | null): string {
  return formatDurationValue(Math.round((secs / unitSeconds(unit)) * 100) / 100, unit);
}

// ── Temperatures ──────────────────────────────────────────────────────

export function fToC(f: number): number {
  return Math.round(((f - 32) * 5 / 9) * 10) / 10;
}

// ── Times ─────────────────────────────────────────────────────────────

/** "21:00:00" → "9:00 PM". */
export function formatClockTime(time: string): string {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MINUTES_PER_DAY = 1440;
const MINUTES_PER_WEEK = MINUTES_PER_DAY * 7;

function dayIndex(day: string): number {
  return WEEK_DAYS.findIndex((d) => d.toLowerCase() === day.toLowerCase());
}

function clockMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
}

function minutesToClock(minutes: number): string {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`;
}

/** Minute of the week (Sunday 00:00 = 0) a window starts at. */
function windowStart(window: CareTimeWindow): number {
  return Math.max(dayIndex(window.day), 0) * MINUTES_PER_DAY + clockMinutes(window.startTime);
}

/** "Mon 8:00 AM – Mon 10:00 AM". */
export function formatTimeWindow(window: CareTimeWindow): string {
  const start = windowStart(window);
  const end = (start + Math.round(window.durationSecs / 60)) % MINUTES_PER_WEEK;
  const label = (minute: number) =>
    `${WEEK_DAYS[Math.floor(minute / MINUTES_PER_DAY)].slice(0, 3)} ${formatClockTime(minutesToClock(minute))}`;
  return `${label(start)} – ${label(end)}`;
}

export interface TimeWindowInput {
  startDay: string;
  startTime: string;
  endDay: string;
  endTime: string;
}

export type TimeWindowResult =
  | { window: CareTimeWindow; error?: undefined }
  | { window?: undefined; error: string };

/**
 * Build a platform time window from a start and end day/time, rejecting an
 * empty window and one that overlaps an existing window. A window may wrap
 * past the end of the week (e.g. Saturday 10 PM – Sunday 6 AM).
 */
export function buildTimeWindow(input: TimeWindowInput, existing: CareTimeWindow[]): TimeWindowResult {
  if (!input.startTime || !input.endTime || dayIndex(input.startDay) < 0 || dayIndex(input.endDay) < 0) {
    return { error: 'Choose a start and end day and time.' };
  }
  const start = dayIndex(input.startDay) * MINUTES_PER_DAY + clockMinutes(input.startTime);
  let end = dayIndex(input.endDay) * MINUTES_PER_DAY + clockMinutes(input.endTime);
  if (end === start) return { error: 'The start time and end time must be different.' };
  if (end < start) end += MINUTES_PER_WEEK;
  const length = end - start;

  const overlaps = existing.some((w) => {
    const s = windowStart(w);
    const e = s + Math.round(w.durationSecs / 60);
    return [-MINUTES_PER_WEEK, 0, MINUTES_PER_WEEK].some((shift) => start < e + shift && s + shift < start + length);
  });
  if (overlaps) return { error: 'This event overlaps with an existing event.' };

  return {
    window: {
      day: WEEK_DAYS[dayIndex(input.startDay)],
      startTime: minutesToClock(clockMinutes(input.startTime)),
      durationSecs: length * 60,
    },
  };
}

// ── Defaults and summaries ────────────────────────────────────────────

/** A new, unsaved behavior pre-filled from a template (legacy `care-behaviors.json`). */
export function newBehaviorFrom(template: CareTemplate): CareBehavior {
  const behavior: CareBehavior = {
    templateId: template.id,
    name: template.name,
    type: template.type,
    enabled: true,
    devices: [],
    timeWindows: [],
  };
  const duration = templateField(template, 'duration');
  if (duration?.values.length) behavior.durationSecs = durationToSeconds(duration.values[0], duration.unit);
  if (templateField(template, 'time')) behavior.presenceRequiredTime = DEFAULT_CURFEW_TIME;
  if (templateField(template, 'devicesOpenCount')) behavior.openCount = {};
  if (templateField(template, 'temperatureRange')) {
    behavior.lowTemp = DEFAULT_LOW_TEMP_C;
    behavior.highTemp = DEFAULT_HIGH_TEMP_C;
  }
  return behavior;
}

function deviceCount(count: number): string {
  return `${count} Device${count === 1 ? '' : 's'}`;
}

/**
 * Short summary of a field's current value, or `null` when a required value
 * is missing. Device counts only include devices the template still offers.
 */
export function summarizeField(behavior: CareBehavior, field: CareTemplateField, template: CareTemplate): string | null {
  const available = new Set(template.availableDevices);
  switch (field.key) {
    case 'devices': {
      const n = (behavior.devices ?? []).filter((d) => available.has(d)).length;
      return n ? deviceCount(n) : null;
    }
    case 'devicesOpenCount': {
      const n = Object.keys(behavior.openCount ?? {}).filter((d) => available.has(d)).length;
      return n ? deviceCount(n) : null;
    }
    case 'duration':
      return behavior.durationSecs ? formatDurationSecs(behavior.durationSecs, field.unit) : null;
    case 'temperatureRange':
      return behavior.lowTemp == null || behavior.highTemp == null
        ? null
        : `${cToF(behavior.lowTemp)}° – ${cToF(behavior.highTemp)}°`;
    case 'time':
      return behavior.presenceRequiredTime ? formatClockTime(behavior.presenceRequiredTime) : null;
    case 'timeWindows': {
      const n = behavior.timeWindows?.length ?? 0;
      return n ? `${n} Event${n === 1 ? '' : 's'}` : '24/7';
    }
  }
}

/** Error shown for a failed AddBehavior / UpdateBehavior, by platform error code. */
export function saveErrorMessage(code: string | undefined): string {
  if (code === 'care.name_in_use') return 'Care Behavior name must be unique.';
  if (code === 'care.window_duration_too_short') {
    return 'There is a conflict between the chosen duration and the scheduled monitoring times.';
  }
  return 'Error saving Care Behavior. Please try again.';
}
