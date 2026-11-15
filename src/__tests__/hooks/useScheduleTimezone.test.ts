import { renderHook } from '@testing-library/react';
import { Base, Place } from '@arcus/core';
import { useScheduleTimezone } from '@/hooks/useScheduleTimezone';
import type { PlaceData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

interface MockState {
  place: { place: PlaceData | null };
}

let mockState: MockState;
let mockLocalTz: string | undefined;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: MockState) => unknown) => selector(mockState),
}));

jest.mock('@/lib/scheduleTimezone', () => ({
  ...jest.requireActual('@/lib/scheduleTimezone'),
  getBrowserTimeZone: () => mockLocalTz,
}));

// ── Helpers ───────────────────────────────────────────────────────────

function place(overrides: Partial<PlaceData> = {}): PlaceData {
  return { [Base.ATTR_ADDRESS]: 'SERV:place:p1', [Base.ATTR_ID]: 'p1', ...overrides };
}

beforeEach(() => {
  mockLocalTz = 'America/New_York';
  mockState = { place: { place: place({ [Place.ATTR_TZID]: 'America/Chicago', [Place.ATTR_TZNAME]: 'Central' }) } };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('useScheduleTimezone', () => {
  it('reports both zones and that times are converted', () => {
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current).toMatchObject({
      placeTimeZone: 'America/Chicago',
      placeTimeZoneName: 'Central',
      localTimeZone: 'America/New_York',
      converts: true,
    });
  });

  it('converts place time to local time and back', () => {
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.toLocal('23:30:00', ['SUN'])).toEqual({ time: '00:30:00', days: ['MON'] });
    expect(result.current.toPlace('00:30:00', ['MON'])).toEqual({ time: '23:30:00', days: ['SUN'] });
  });

  it('falls back to the zone id when the place has no zone name', () => {
    mockState = { place: { place: place({ [Place.ATTR_TZID]: 'America/Chicago' }) } };
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.placeTimeZoneName).toBe('America/Chicago');
  });

  it('does not convert when the place has no timezone', () => {
    mockState = { place: { place: place() } };
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.converts).toBe(false);
    expect(result.current.toLocal('10:00:00', ['MON'])).toEqual({ time: '10:00:00', days: ['MON'] });
  });

  it('does not convert when no place is loaded', () => {
    mockState = { place: { place: null } };
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.converts).toBe(false);
    expect(result.current.placeTimeZone).toBeUndefined();
  });

  it('does not convert when the browser timezone is unknown', () => {
    mockLocalTz = undefined;
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.converts).toBe(false);
  });

  it('does not convert when both zones share an offset', () => {
    mockLocalTz = 'America/Detroit';
    mockState = { place: { place: place({ [Place.ATTR_TZID]: 'America/New_York' }) } };
    const { result } = renderHook(() => useScheduleTimezone());
    expect(result.current.converts).toBe(false);
  });
});
