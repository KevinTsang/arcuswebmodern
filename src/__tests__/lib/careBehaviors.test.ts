import {
  buildTimeWindow,
  durationToSeconds,
  formatClockTime,
  formatDurationSecs,
  formatDurationValue,
  formatTimeWindow,
  fToC,
  newBehaviorFrom,
  saveErrorMessage,
  summarizeField,
  templateField,
  transformTemplate,
  DEFAULT_CURFEW_TIME,
  DEFAULT_HIGH_TEMP_C,
  DEFAULT_LOW_TEMP_C,
} from '@/lib/careBehaviors';
import {
  CURFEW_TEMPLATE,
  DOOR_ADDR,
  INACTIVITY_TEMPLATE,
  MOTION_ADDR,
  OPEN_COUNT_TEMPLATE,
  TEMPERATURE_TEMPLATE,
  makeCareBehavior,
} from '../helpers/careBehaviorFixtures';

describe('transformTemplate', () => {
  it('collapses the parallel field maps into ordered fields', () => {
    expect(INACTIVITY_TEMPLATE.fields.map((f) => f.key)).toEqual(['devices', 'duration', 'timeWindows']);
    expect(templateField(INACTIVITY_TEMPLATE, 'duration')).toEqual({
      key: 'duration',
      label: 'No Activity For...',
      description: 'Trigger the alarm when no activity is detected for a period of time.',
      values: ['30', '60', '120'],
      unit: 'MINUTES',
    });
    expect(INACTIVITY_TEMPLATE.availableDevices).toEqual([MOTION_ADDR, DOOR_ADDR]);
  });

  it('maps a NODURATION time window to a curfew time field', () => {
    expect(CURFEW_TEMPLATE.fields.map((f) => f.key)).toEqual(['devices', 'time']);
    expect(templateField(CURFEW_TEMPLATE, 'time')?.label).toBe('Curfew Time');
  });

  it('maps OPEN_COUNT devices to an open-count field with 1–50 values', () => {
    const field = templateField(OPEN_COUNT_TEMPLATE, 'devicesOpenCount');
    expect(OPEN_COUNT_TEMPLATE.fields.map((f) => f.key)).toEqual(['devicesOpenCount']);
    expect(field?.values).toHaveLength(50);
    expect(field?.values[0]).toBe('1');
  });

  it('merges low/high temperatures into one temperature range field', () => {
    const field = templateField(TEMPERATURE_TEMPLATE, 'temperatureRange');
    expect(field).toEqual({
      key: 'temperatureRange',
      label: 'Temperature Range',
      description: 'Choose the temperature range that you want to monitor.',
      values: ['20', '105'],
      unit: 'fahrenheit',
    });
  });

  it('tolerates a template with no field maps', () => {
    expect(transformTemplate({ id: '9', name: 'Bare' })).toEqual({
      id: '9', name: 'Bare', description: '', type: '', availableDevices: [], fields: [],
    });
  });

  it('ignores unknown field keys', () => {
    expect(transformTemplate({ id: '9', name: 'X', fieldLabels: { mystery: 'M' } }).fields).toEqual([]);
  });
});

describe('durations', () => {
  it('converts values to seconds by unit', () => {
    expect(durationToSeconds('30', 'MINUTES')).toBe(1800);
    expect(durationToSeconds('2', 'HOURS')).toBe(7200);
    expect(durationToSeconds('1', 'DAYS')).toBe(86400);
    expect(durationToSeconds('5', null)).toBe(5);
    expect(durationToSeconds('5', 'FORTNIGHTS')).toBe(5);
  });

  it('formats values with singular and plural units', () => {
    expect(formatDurationValue(30, 'MINUTES')).toBe('30 Minutes');
    expect(formatDurationValue(1, 'DAYS')).toBe('1 Day');
    expect(formatDurationValue(3, null)).toBe('3 Seconds');
    expect(formatDurationSecs(7200, 'HOURS')).toBe('2 Hours');
    expect(formatDurationSecs(1800, 'MINUTES')).toBe('30 Minutes');
  });
});

describe('temperatures and times', () => {
  it('converts Fahrenheit to Celsius to one decimal', () => {
    expect(fToC(65)).toBe(18.3);
    expect(fToC(32)).toBe(0);
  });

  it('formats clock times as 12-hour times', () => {
    expect(formatClockTime('21:00:00')).toBe('9:00 PM');
    expect(formatClockTime('00:05:00')).toBe('12:05 AM');
    expect(formatClockTime('12:30:00')).toBe('12:30 PM');
    expect(formatClockTime('garbage')).toBe('garbage');
  });

  it('formats a time window, including one that wraps the week', () => {
    expect(formatTimeWindow({ day: 'Monday', startTime: '08:00:00', durationSecs: 7200 })).toBe('Mon 8:00 AM – Mon 10:00 AM');
    expect(formatTimeWindow({ day: 'SATURDAY', startTime: '22:00:00', durationSecs: 8 * 3600 })).toBe('Sat 10:00 PM – Sun 6:00 AM');
  });
});

describe('buildTimeWindow', () => {
  it('builds a window from a start and end', () => {
    expect(buildTimeWindow({ startDay: 'Monday', startTime: '08:00', endDay: 'Monday', endTime: '17:00' }, [])).toEqual({
      window: { day: 'Monday', startTime: '08:00:00', durationSecs: 9 * 3600 },
    });
  });

  it('wraps an end before the start into the next week', () => {
    const result = buildTimeWindow({ startDay: 'Saturday', startTime: '22:00', endDay: 'Sunday', endTime: '06:00' }, []);
    expect(result.window?.durationSecs).toBe(8 * 3600);
  });

  it('rejects identical start and end', () => {
    expect(buildTimeWindow({ startDay: 'Monday', startTime: '08:00', endDay: 'Monday', endTime: '08:00' }, []).error)
      .toBe('The start time and end time must be different.');
  });

  it('rejects missing input', () => {
    expect(buildTimeWindow({ startDay: 'Monday', startTime: '', endDay: 'Monday', endTime: '08:00' }, []).error)
      .toBe('Choose a start and end day and time.');
    expect(buildTimeWindow({ startDay: 'Someday', startTime: '07:00', endDay: 'Monday', endTime: '08:00' }, []).error)
      .toBe('Choose a start and end day and time.');
  });

  it('rejects an overlapping window, including across the week boundary', () => {
    const existing = [{ day: 'Saturday', startTime: '22:00:00', durationSecs: 8 * 3600 }];
    expect(buildTimeWindow({ startDay: 'Sunday', startTime: '05:00', endDay: 'Sunday', endTime: '07:00' }, existing).error)
      .toBe('This event overlaps with an existing event.');
    expect(buildTimeWindow({ startDay: 'Sunday', startTime: '06:00', endDay: 'Sunday', endTime: '07:00' }, existing).window)
      .toBeDefined();
  });
});

describe('newBehaviorFrom', () => {
  it('pre-fills the first duration and empty lists', () => {
    expect(newBehaviorFrom(INACTIVITY_TEMPLATE)).toEqual({
      templateId: '1', name: 'No Activity Detected', type: 'INACTIVITY', enabled: true,
      devices: [], timeWindows: [], durationSecs: 1800,
    });
  });

  it('pre-fills curfew time, open counts and temperatures', () => {
    expect(newBehaviorFrom(CURFEW_TEMPLATE).presenceRequiredTime).toBe(DEFAULT_CURFEW_TIME);
    expect(newBehaviorFrom(OPEN_COUNT_TEMPLATE).openCount).toEqual({});
    const temp = newBehaviorFrom(TEMPERATURE_TEMPLATE);
    expect([temp.lowTemp, temp.highTemp]).toEqual([DEFAULT_LOW_TEMP_C, DEFAULT_HIGH_TEMP_C]);
  });
});

describe('summarizeField', () => {
  const field = (t: typeof INACTIVITY_TEMPLATE, k: Parameters<typeof templateField>[1]) => templateField(t, k)!;

  it('counts only devices the template still offers', () => {
    const b = makeCareBehavior({ devices: [MOTION_ADDR, 'DRIV:dev:gone'] });
    expect(summarizeField(b, field(INACTIVITY_TEMPLATE, 'devices'), INACTIVITY_TEMPLATE)).toBe('1 Device');
    expect(summarizeField({ ...b, devices: [MOTION_ADDR, DOOR_ADDR] }, field(INACTIVITY_TEMPLATE, 'devices'), INACTIVITY_TEMPLATE)).toBe('2 Devices');
    expect(summarizeField({ ...b, devices: [] }, field(INACTIVITY_TEMPLATE, 'devices'), INACTIVITY_TEMPLATE)).toBeNull();
  });

  it('summarizes open counts', () => {
    const f = field(OPEN_COUNT_TEMPLATE, 'devicesOpenCount');
    expect(summarizeField({ openCount: { [DOOR_ADDR]: 5 } }, f, OPEN_COUNT_TEMPLATE)).toBe('1 Device');
    expect(summarizeField({}, f, OPEN_COUNT_TEMPLATE)).toBeNull();
  });

  it('summarizes duration, temperatures, curfew and windows', () => {
    expect(summarizeField(makeCareBehavior(), field(INACTIVITY_TEMPLATE, 'duration'), INACTIVITY_TEMPLATE)).toBe('30 Minutes');
    expect(summarizeField({}, field(INACTIVITY_TEMPLATE, 'duration'), INACTIVITY_TEMPLATE)).toBeNull();
    const t = field(TEMPERATURE_TEMPLATE, 'temperatureRange');
    expect(summarizeField({ lowTemp: 18.3, highTemp: 20 }, t, TEMPERATURE_TEMPLATE)).toBe('65° – 68°');
    expect(summarizeField({ lowTemp: 18.3 }, t, TEMPERATURE_TEMPLATE)).toBeNull();
    const c = field(CURFEW_TEMPLATE, 'time');
    expect(summarizeField({ presenceRequiredTime: '21:30:00' }, c, CURFEW_TEMPLATE)).toBe('9:30 PM');
    expect(summarizeField({}, c, CURFEW_TEMPLATE)).toBeNull();
    const w = field(INACTIVITY_TEMPLATE, 'timeWindows');
    expect(summarizeField({}, w, INACTIVITY_TEMPLATE)).toBe('24/7');
    const win = { day: 'Monday', startTime: '08:00:00', durationSecs: 60 };
    expect(summarizeField({ timeWindows: [win] }, w, INACTIVITY_TEMPLATE)).toBe('1 Event');
    expect(summarizeField({ timeWindows: [win, win] }, w, INACTIVITY_TEMPLATE)).toBe('2 Events');
  });
});

describe('saveErrorMessage', () => {
  it('maps platform error codes to messages', () => {
    expect(saveErrorMessage('care.name_in_use')).toBe('Care Behavior name must be unique.');
    expect(saveErrorMessage('care.window_duration_too_short')).toMatch(/conflict between the chosen duration/);
    expect(saveErrorMessage(undefined)).toBe('Error saving Care Behavior. Please try again.');
  });
});
