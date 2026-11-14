import type { ReactNode } from 'react';

/** Time reference for a scheduled command. */
export type ScheduleTimeMode = 'ABSOLUTE' | 'SUNRISE' | 'SUNSET';

/** A single attribute value a scheduled command sets on its target. */
export type ScheduleAttributeValue = string | number | boolean;

/** Attributes a scheduled command sends with its message (e.g. `base:SetAttributes`). */
export interface ScheduleAttributes {
  [attribute: string]: ScheduleAttributeValue;
}

/** A command stored in a scheduler's `scheduler:commands` map. */
export interface ScheduledCommand {
  id?: string;
  scheduleId?: string;
  time?: string;
  days?: string[];
  mode?: ScheduleTimeMode;
  offsetMinutes?: number;
  messageType?: string;
  attributes?: ScheduleAttributes;
}

/** Props handed to a target-specific attribute editor inside the event editor. */
export interface ScheduleAttributeEditorProps {
  scheduleId: string;
  attributes: ScheduleAttributes;
  onChange: (attributes: ScheduleAttributes) => void;
}

/** Renders the target-specific controls (e.g. thermostat setpoints) for an event. */
export type ScheduleAttributeEditorRenderer = (props: ScheduleAttributeEditorProps) => ReactNode;
