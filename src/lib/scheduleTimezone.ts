/**
 * Timezone conversion for scheduled events.
 *
 * The platform stores a weekly schedule's `time` / `days` in the place's
 * timezone (`place:tzId`). Like the legacy client
 * (`components/schedule/from-to-timezones.js`), the UI shows and edits event
 * times in the viewer's own (browser) timezone, converting place → local when
 * reading a scheduler and local → place when saving an event.
 *
 * Offsets are taken at a single reference instant (now, by default), so a
 * conversion across a DST change applies today's offset — the same behaviour
 * as the legacy client.
 */

/** Platform day tokens, in the same order the schedule calendar shows them. */
export const SCHEDULE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

const MINUTES_PER_DAY = 24 * 60;

/** An event time (`HH:mm:ss`) and the days it repeats on. */
export interface ScheduleTime {
  time: string;
  days: string[];
}

/** The viewer's IANA timezone, or `undefined` when the runtime cannot tell. */
export function getBrowserTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Minutes `timeZone` is ahead of UTC at `at`. Throws a `RangeError` for a
 * timezone the runtime does not know.
 */
export function timeZoneOffsetMinutes(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const wallClockAsUtc = Date.UTC(
    part('year'), part('month') - 1, part('day'),
    part('hour') % 24, part('minute'), part('second'),
  );
  return Math.round((wallClockAsUtc - at.getTime()) / 60000);
}

/**
 * Minutes to add to a wall-clock time in `fromTz` to get the same instant in
 * `toTz`, or `0` when either zone is missing or unknown.
 */
export function timeZoneDelta(
  fromTz: string | undefined,
  toTz: string | undefined,
  at: Date = new Date(),
): number {
  if (!fromTz || !toTz || fromTz === toTz) return 0;
  try {
    return timeZoneOffsetMinutes(toTz, at) - timeZoneOffsetMinutes(fromTz, at);
  } catch {
    return 0;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Convert an event's time and days from one timezone to another. Days roll
 * forward or back when the converted time crosses midnight. Unknown day tokens
 * and unparseable times are passed through unchanged.
 */
export function convertScheduleTime(
  fromTz: string | undefined,
  toTz: string | undefined,
  time: string,
  days: string[],
  at: Date = new Date(),
): ScheduleTime {
  const delta = timeZoneDelta(fromTz, toTz, at);
  const [h, m] = time.split(':').map(Number);
  if (delta === 0 || Number.isNaN(h) || Number.isNaN(m)) return { time, days };

  const total = h * 60 + m + delta;
  const dayShift = Math.floor(total / MINUTES_PER_DAY);
  const minutes = ((total % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const shifted = days.map((day) => {
    const index = (SCHEDULE_DAYS as readonly string[]).indexOf(day);
    if (index < 0) return day;
    return SCHEDULE_DAYS[(((index + dayShift) % 7) + 7) % 7];
  });

  return {
    time: `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}:00`,
    days: shifted,
  };
}
