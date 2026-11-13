'use client';

import { useCallback, useMemo } from 'react';
import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import {
  convertScheduleTime,
  getBrowserTimeZone,
  timeZoneDelta,
  type ScheduleTime,
} from '@/lib/scheduleTimezone';

export interface ScheduleTimezone {
  /** The active place's IANA timezone (`place:tzId`), when known. */
  placeTimeZone?: string;
  /** Display name of the place timezone (`place:tzName`), falling back to its id. */
  placeTimeZoneName?: string;
  /** The viewer's browser timezone, when known. */
  localTimeZone?: string;
  /** True when place and local clocks differ, so times are being converted. */
  converts: boolean;
  /** Convert a platform (place-time) event to the viewer's local time. */
  toLocal: (time: string, days: string[]) => ScheduleTime;
  /** Convert a time entered in local time to place time for the platform. */
  toPlace: (time: string, days: string[]) => ScheduleTime;
}

/**
 * Timezone context for schedule editing: schedules are stored in the place's
 * timezone but shown and edited in the viewer's.
 */
export function useScheduleTimezone(): ScheduleTimezone {
  const placeTimeZone = useAppSelector((s) => s.place.place?.[Place.ATTR_TZID]);
  const placeTzName = useAppSelector((s) => s.place.place?.[Place.ATTR_TZNAME]);
  const localTimeZone = useMemo(() => getBrowserTimeZone(), []);
  const converts = timeZoneDelta(placeTimeZone, localTimeZone) !== 0;

  const toLocal = useCallback(
    (time: string, days: string[]) => convertScheduleTime(placeTimeZone, localTimeZone, time, days),
    [placeTimeZone, localTimeZone],
  );
  const toPlace = useCallback(
    (time: string, days: string[]) => convertScheduleTime(localTimeZone, placeTimeZone, time, days),
    [placeTimeZone, localTimeZone],
  );

  return {
    placeTimeZone,
    placeTimeZoneName: placeTzName || placeTimeZone,
    localTimeZone,
    converts,
    toLocal,
    toPlace,
  };
}
