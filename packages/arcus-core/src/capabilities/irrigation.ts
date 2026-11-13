/**
 * Irrigation schedule constants that the capability generator does not emit.
 *
 * The schedule modes are enum values on struct types (IrrigationSchedule,
 * IrrigationScheduleStatus) and on LawnNGardenSubsystem method parameters,
 * so capabilities.ts has no constants for them.
 */

/** Watering schedule modes (`sublawnngarden:SwitchScheduleMode` `mode`). */
export const IrrigationScheduleMode = {
  WEEKLY: 'WEEKLY',
  INTERVAL: 'INTERVAL',
  EVEN: 'EVEN',
  ODD: 'ODD',
} as const;

export type IrrigationScheduleModeValue =
  (typeof IrrigationScheduleMode)[keyof typeof IrrigationScheduleMode];

/** Platform error code returned when an event's start time overlaps another event. */
export const IRRIGATION_ERROR_HAS_OVERLAPS = 'lawnngarden.scheduling.has_overlaps';
