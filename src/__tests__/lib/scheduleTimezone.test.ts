import {
  convertScheduleTime,
  getBrowserTimeZone,
  timeZoneDelta,
  timeZoneOffsetMinutes,
} from '@/lib/scheduleTimezone';

// ── Helpers ───────────────────────────────────────────────────────────

const WINTER = new Date('2026-01-15T12:00:00Z');
const SUMMER = new Date('2026-07-15T12:00:00Z');

// ── Tests ─────────────────────────────────────────────────────────────

describe('timeZoneOffsetMinutes', () => {
  it('returns 0 for UTC', () => {
    expect(timeZoneOffsetMinutes('UTC', WINTER)).toBe(0);
  });

  it('follows daylight saving time', () => {
    expect(timeZoneOffsetMinutes('America/New_York', WINTER)).toBe(-300);
    expect(timeZoneOffsetMinutes('America/New_York', SUMMER)).toBe(-240);
  });

  it('handles half-hour zones', () => {
    expect(timeZoneOffsetMinutes('Asia/Kolkata', WINTER)).toBe(330);
  });

  it('throws for an unknown zone', () => {
    expect(() => timeZoneOffsetMinutes('Not/AZone', WINTER)).toThrow(RangeError);
  });
});

describe('timeZoneDelta', () => {
  it('is the difference between the two offsets', () => {
    expect(timeZoneDelta('America/Chicago', 'America/New_York', WINTER)).toBe(60);
    expect(timeZoneDelta('America/New_York', 'America/Chicago', SUMMER)).toBe(-60);
  });

  it('is 0 when either zone is missing, unknown or the same', () => {
    expect(timeZoneDelta(undefined, 'UTC', WINTER)).toBe(0);
    expect(timeZoneDelta('UTC', undefined, WINTER)).toBe(0);
    expect(timeZoneDelta('UTC', 'UTC', WINTER)).toBe(0);
    expect(timeZoneDelta('UTC', 'Not/AZone', WINTER)).toBe(0);
  });
});

describe('convertScheduleTime', () => {
  it('shifts the time within the same day', () => {
    expect(convertScheduleTime('America/Chicago', 'America/New_York', '07:30:00', ['MON', 'WED'], WINTER))
      .toEqual({ time: '08:30:00', days: ['MON', 'WED'] });
  });

  it('rolls days forward when crossing midnight', () => {
    expect(convertScheduleTime('UTC', 'Asia/Tokyo', '20:00:00', ['SUN', 'FRI'], WINTER))
      .toEqual({ time: '05:00:00', days: ['MON', 'SAT'] });
  });

  it('rolls days back when crossing midnight the other way', () => {
    expect(convertScheduleTime('Asia/Tokyo', 'UTC', '05:00:00', ['MON', 'SAT'], WINTER))
      .toEqual({ time: '20:00:00', days: ['SUN', 'FRI'] });
  });

  it('handles half-hour offsets', () => {
    expect(convertScheduleTime('UTC', 'Asia/Kolkata', '23:45:00', ['TUE'], WINTER))
      .toEqual({ time: '05:15:00', days: ['WED'] });
  });

  it('round-trips', () => {
    const local = convertScheduleTime('America/Los_Angeles', 'Europe/London', '18:15:00', ['THU'], WINTER);
    expect(convertScheduleTime('Europe/London', 'America/Los_Angeles', local.time, local.days, WINTER))
      .toEqual({ time: '18:15:00', days: ['THU'] });
  });

  it('passes through when no conversion applies', () => {
    expect(convertScheduleTime(undefined, 'UTC', '10:00:00', ['MON'], WINTER))
      .toEqual({ time: '10:00:00', days: ['MON'] });
    expect(convertScheduleTime('UTC', 'UTC', '10:00:00', ['MON'], WINTER))
      .toEqual({ time: '10:00:00', days: ['MON'] });
  });

  it('passes through an unparseable time and unknown day tokens', () => {
    expect(convertScheduleTime('UTC', 'Asia/Tokyo', 'noon', ['MON'], WINTER))
      .toEqual({ time: 'noon', days: ['MON'] });
    expect(convertScheduleTime('UTC', 'Asia/Tokyo', '20:00:00', ['XYZ'], WINTER))
      .toEqual({ time: '05:00:00', days: ['XYZ'] });
  });

  it('defaults the reference instant to now', () => {
    expect(convertScheduleTime('UTC', 'Asia/Tokyo', '00:00:00', ['MON']))
      .toEqual({ time: '09:00:00', days: ['MON'] });
  });
});

describe('getBrowserTimeZone', () => {
  it('returns the runtime timezone', () => {
    expect(getBrowserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it('returns undefined when Intl throws', () => {
    const spy = jest.spyOn(Intl, 'DateTimeFormat').mockImplementationOnce(() => {
      throw new Error('no intl');
    });
    expect(getBrowserTimeZone()).toBeUndefined();
    spy.mockRestore();
  });
});
