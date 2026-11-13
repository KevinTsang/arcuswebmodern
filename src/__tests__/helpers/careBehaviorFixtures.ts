/**
 * Care behavior template / behavior fixtures shared by the care behavior tests.
 * Raw templates mirror what `subcare:ListBehaviorTemplates` returns.
 */

import { transformTemplate, type CareBehaviorTemplateData, type CareTemplate } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';

export const CARE_ADDR = 'SERV:subcare:place-1';
export const MOTION_ADDR = 'DRIV:dev:motion-1';
export const DOOR_ADDR = 'DRIV:dev:door-1';
export const TEMP_ADDR = 'DRIV:dev:temp-1';

export const RAW_INACTIVITY: CareBehaviorTemplateData = {
  id: '1',
  name: 'No Activity Detected',
  description: 'Trigger an alarm if no activity occurs.',
  type: 'INACTIVITY',
  timeWindowSupport: 'REQUIRED',
  availableDevices: [MOTION_ADDR, DOOR_ADDR],
  fieldLabels: { duration: 'No Activity For...', timeWindows: 'Days & Times To Monitor', devices: 'Participating Devices' },
  fieldDescriptions: {
    duration: 'Trigger the alarm when no activity is detected for a period of time.',
    timeWindows: 'Choose when you want to monitor for lack of activity.',
    devices: 'Choose the devices that will trigger a Care Alarm.',
  },
  fieldValues: { duration: '30,60,120', timeWindows: null, devices: null },
  fieldUnits: { duration: 'MINUTES', timeWindows: null, devices: null },
};

export const RAW_CURFEW: CareBehaviorTemplateData = {
  id: '6',
  name: 'Curfew',
  description: 'Trigger a Care Alarm when a loved one is not home by a certain time.',
  type: 'PRESENCE',
  availableDevices: [],
  fieldLabels: { timeWindows: 'Curfew Time', devices: 'Participating Devices' },
  fieldDescriptions: { timeWindows: 'Choose what time.', devices: 'Choose the devices.' },
  fieldValues: { timeWindows: null, devices: null },
  fieldUnits: { timeWindows: 'NODURATION', devices: null },
};

export const RAW_OPEN_COUNT: CareBehaviorTemplateData = {
  id: '7',
  name: 'Monitor Memory Habits',
  description: 'Trigger a Care Alarm when a contact sensor is opened more than normal.',
  type: 'OPEN_COUNT',
  availableDevices: [DOOR_ADDR],
  fieldLabels: { devices: 'Participating Devices' },
  fieldDescriptions: { devices: 'Choose the devices and maximum number of opens.' },
  fieldValues: { devices: null },
  fieldUnits: { devices: null },
};

export const RAW_TEMPERATURE: CareBehaviorTemplateData = {
  id: '8',
  name: 'Monitor Home Temperature',
  description: 'Trigger a Care Alarm when the home is too hot or too cold.',
  type: 'TEMPERATURE',
  availableDevices: [TEMP_ADDR],
  fieldLabels: { devices: 'Participating Devices', lowTemp: 'Choose a low temperature', highTemp: 'Choose a high temperature' },
  fieldDescriptions: { devices: 'Choose the devices.', lowTemp: '', highTemp: '' },
  fieldValues: { devices: null, lowTemp: '20-105', highTemp: '20-105' },
  fieldUnits: { devices: null, lowTemp: 'fahrenheit', highTemp: 'fahrenheit' },
};

export const INACTIVITY_TEMPLATE: CareTemplate = transformTemplate(RAW_INACTIVITY);
export const CURFEW_TEMPLATE: CareTemplate = transformTemplate(RAW_CURFEW);
export const OPEN_COUNT_TEMPLATE: CareTemplate = transformTemplate(RAW_OPEN_COUNT);
export const TEMPERATURE_TEMPLATE: CareTemplate = transformTemplate(RAW_TEMPERATURE);

export function makeCareBehavior(overrides: Partial<CareBehavior> = {}): CareBehavior {
  return {
    id: 'behavior-1',
    templateId: '1',
    name: 'Morning activity',
    type: 'INACTIVITY',
    enabled: true,
    devices: [MOTION_ADDR],
    timeWindows: [],
    durationSecs: 1800,
    ...overrides,
  };
}
