/**
 * Irrigation helpers and platform data shapes.
 *
 * Shapes mirror the platform types in arcus-model (`IrrigationSchedule`,
 * `IntervalIrrigationSchedule`, `IrrigationScheduleEvent`,
 * `WeeklyIrrigationScheduleEvent`, `IrrigationTransitionEvent`,
 * `IrrigationScheduleStatus`, `ZoneDuration`). Zone attributes are instance
 * attributes on the controller device: `irr:zonename:z1`, `irr:zoneState:z1`…
 */

import {
  Base,
  IrrigationController,
  IrrigationScheduleMode,
  IrrigationZone,
  LawnNGardenSubsystem,
  type IrrigationScheduleModeValue,
} from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Platform data shapes ───────────────────────────────────────────────

/** `ZoneDuration` — a zone and how long to water it, in minutes. */
export interface IrrigationZoneDuration {
  zone: string;
  duration: number;
}

/** `IrrigationTransitionEvent` — one zone's watering within a schedule event. */
export interface IrrigationTransitionEvent {
  controller?: string;
  zone: string;
  duration: number;
  startTime?: number;
  timeOfDay?: string;
  status?: string;
  retryCount?: number;
}

/** `IrrigationScheduleEvent` / `WeeklyIrrigationScheduleEvent`. */
export interface IrrigationScheduleEvent {
  eventId: string;
  /** Start time as `HH:mm` or `HH:mm:ss` (24-hour). */
  timeOfDay: string;
  events?: IrrigationTransitionEvent[];
  type?: IrrigationScheduleModeValue;
  status?: string;
  /** Weekly events only: `MON`…`SUN`. */
  days?: string[];
}

/** `IrrigationSchedule` / `IntervalIrrigationSchedule`. */
export interface IrrigationSchedule {
  controller?: string;
  type?: IrrigationScheduleModeValue;
  status?: string;
  events?: IrrigationScheduleEvent[];
  /** Interval schedules only: number of days between waterings. */
  days?: number;
  /** Interval schedules only: the date the interval started. */
  startDate?: number;
}

/** `IrrigationScheduleStatus` — per-controller entry in `sublawnngarden:scheduleStatus`. */
export interface IrrigationScheduleStatus {
  controller?: string;
  mode?: IrrigationScheduleModeValue;
  enabled?: boolean;
  nextEvent?: IrrigationTransitionEvent;
  skippedUntil?: number;
}

/** A zone on an irrigation controller, resolved from its instance attributes. */
export interface IrrigationZoneInfo {
  /** Instance id, e.g. `z1`. */
  zone: string;
  /** 1-based zone number used for ordering. */
  zoneNum: number;
  name: string;
  watering: boolean;
  /** Default watering duration (minutes), used to seed new schedule events. */
  defaultDuration: number;
  /** Duration of the current watering (minutes); 0 when idle. */
  wateringDuration: number;
}

// ── Constants ──────────────────────────────────────────────────────────

/** The schedule modes, in the order the legacy client shows them. */
export const SCHEDULE_MODES: IrrigationScheduleModeValue[] = [
  IrrigationScheduleMode.WEEKLY,
  IrrigationScheduleMode.INTERVAL,
  IrrigationScheduleMode.EVEN,
  IrrigationScheduleMode.ODD,
];

export const SCHEDULE_MODE_LABELS: Record<IrrigationScheduleModeValue, string> = {
  [IrrigationScheduleMode.WEEKLY]: 'Weekly',
  [IrrigationScheduleMode.INTERVAL]: 'Interval',
  [IrrigationScheduleMode.EVEN]: 'Even Days',
  [IrrigationScheduleMode.ODD]: 'Odd Days',
};

export const SCHEDULE_MODE_HELP: Record<IrrigationScheduleModeValue, string> = {
  [IrrigationScheduleMode.WEEKLY]: 'Each day can have a different schedule.',
  [IrrigationScheduleMode.INTERVAL]: 'Set a custom length of time between waterings.',
  [IrrigationScheduleMode.EVEN]: 'Only water on even days of the month.',
  [IrrigationScheduleMode.ODD]: 'Only water on odd days of the month.',
};

export const MANUAL_MODE_HELP = 'No watering schedule. Initiate watering manually.';

/** Subsystem attribute holding each mode's per-controller schedules. */
export const SCHEDULE_ATTR_BY_MODE: Record<IrrigationScheduleModeValue, string> = {
  [IrrigationScheduleMode.WEEKLY]: LawnNGardenSubsystem.ATTR_WEEKLYSCHEDULES,
  [IrrigationScheduleMode.INTERVAL]: LawnNGardenSubsystem.ATTR_INTERVALSCHEDULES,
  [IrrigationScheduleMode.EVEN]: LawnNGardenSubsystem.ATTR_EVENSCHEDULES,
  [IrrigationScheduleMode.ODD]: LawnNGardenSubsystem.ATTR_ODDSCHEDULES,
};

/** Selectable watering durations, in minutes (legacy `possibleWateringTimes`). */
export const WATERING_DURATIONS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30, 45, 60, 120, 180, 240,
];

/** Hours a controller's next scheduled watering can be skipped for. */
export const SKIP_HOURS = [12, 24, 48, 72];

/** Interval-mode choices: water every N days. */
export const INTERVAL_DAYS = [1, 2, 3, 4, 5, 6, 7];

export const WEEK_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export const WEEK_DAY_LABELS: Record<string, string> = {
  MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun',
};

/** Water saver (`irrcont:budget`) range, matching the legacy spinner. */
export const BUDGET_MIN = 0;
export const BUDGET_MAX = 100;
export const BUDGET_STEP = 10;

// ── Helpers ────────────────────────────────────────────────────────────

/** `irr:zonename` + `:z1` → `irr:zonename:z1`. */
export function zoneAttr(attr: string, zone: string): string {
  return `${attr}:${zone}`;
}

/** Fallback zone name, `Zone 3` for `z3`. */
export function defaultZoneName(zone: string): string {
  return `Zone ${zone.replace(/^z/, '')}`;
}

/**
 * The zone instance ids on a controller (`z1`, `z2`…). Prefers the zone
 * instances the device reports (`base:instances` entries with the `irr`
 * capability), then falls back to `irrcont:numZones`.
 */
function zoneIds(device: DeviceEntity): string[] {
  const instances = device[Base.ATTR_INSTANCES];
  if (instances) {
    const ids = Object.keys(instances).filter((id) => instances[id]?.includes(IrrigationZone.NAMESPACE));
    if (ids.length > 0) return ids;
  }
  const count = (device[IrrigationController.ATTR_NUMZONES] as number | undefined) ?? 0;
  return Array.from({ length: count }, (_, i) => `z${i + 1}`);
}

/** Resolve a controller's zones, sorted by zone number. */
export function getIrrigationZones(device: DeviceEntity | undefined): IrrigationZoneInfo[] {
  if (!device) return [];
  return zoneIds(device)
    .map((zone) => {
      const fallbackNum = Number(zone.replace(/^z/, '')) || 0;
      const name = device[zoneAttr(IrrigationZone.ATTR_ZONENAME, zone)] as string | undefined;
      return {
        zone,
        zoneNum: (device[zoneAttr(IrrigationZone.ATTR_ZONENUM, zone)] as number | undefined) ?? fallbackNum,
        name: name && name.length > 0 ? name : defaultZoneName(zone),
        watering: device[zoneAttr(IrrigationZone.ATTR_ZONESTATE, zone)] === IrrigationZone.ZONESTATE_WATERING,
        defaultDuration: (device[zoneAttr(IrrigationZone.ATTR_DEFAULTDURATION, zone)] as number | undefined) || 1,
        wateringDuration: (device[zoneAttr(IrrigationZone.ATTR_WATERINGDURATION, zone)] as number | undefined) ?? 0,
      };
    })
    .sort((a, b) => a.zoneNum - b.zoneNum);
}

/** `5` → `5 min`, `60` → `1 hr`, `120` → `2 hrs`. */
export function formatWateringDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
}

/** `06:30:00` → `6:30 AM`. Returns the input unchanged when it can't be parsed. */
export function formatTimeOfDay(timeOfDay: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeOfDay);
  if (!match) return timeOfDay;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${match[2]} ${suffix}`;
}

/** `06:30:00` → `06:30`, the form `<input type="time">` and the platform take. */
export function toTimeInputValue(timeOfDay: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeOfDay);
  if (!match) return '';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/** Sort weekday codes Monday-first. */
export function sortWeekDays(days: string[]): string[] {
  return [...days].sort((a, b) => WEEK_DAYS.indexOf(a) - WEEK_DAYS.indexOf(b));
}

/** Sort schedule events by start time. */
export function sortEventsByTime(events: IrrigationScheduleEvent[]): IrrigationScheduleEvent[] {
  return [...events].sort((a, b) => toTimeInputValue(a.timeOfDay).localeCompare(toTimeInputValue(b.timeOfDay)));
}

/** `Front, Back & 2 more` — the zones an event waters. */
export function describeEventZones(
  event: IrrigationScheduleEvent,
  zones: IrrigationZoneInfo[],
): string {
  const transitions = event.events ?? [];
  const names = transitions.map((t) => zones.find((z) => z.zone === t.zone)?.name ?? defaultZoneName(t.zone));
  if (names.length <= 2) return names.join(', ');
  return `${names.slice(0, 2).join(', ')} & ${names.length - 2} more`;
}
