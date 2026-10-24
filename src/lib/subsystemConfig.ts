/**
 * Subsystem configuration — ported from config/subsystem.json.
 *
 * Maps subsystem namespace prefixes to display metadata (name, slug,
 * icon) and defines which subsystems are visible and have custom views.
 */

import {
  AlarmSubsystem, CamerasSubsystem, CareSubsystem, ClimateSubsystem, DoorsNLocksSubsystem,
  LawnNGardenSubsystem, LightsNSwitchesSubsystem, PairingSubsystem, PresenceSubsystem,
  SafetySubsystem, SecuritySubsystem, WaterSubsystem,
} from '@arcus/core';

/**
 * Every subsystem capability the client reads. The namespace union derived
 * from it is the only accepted spelling of a subsystem namespace, so a typo
 * (`'subpresence'`) or the wrong kind of attribute fails to compile instead
 * of silently matching nothing.
 */
const SUBSYSTEM_CAPABILITIES = [
  AlarmSubsystem, SecuritySubsystem, SafetySubsystem, CamerasSubsystem, CareSubsystem,
  ClimateSubsystem, DoorsNLocksSubsystem, PresenceSubsystem, LawnNGardenSubsystem,
  LightsNSwitchesSubsystem, WaterSubsystem, PairingSubsystem,
] as const;

export type SubsystemNamespace = (typeof SUBSYSTEM_CAPABILITIES)[number]['NAMESPACE'];

export interface SubsystemConfigEntry {
  name: string;
  slug: string;
  icon: string;
  namespace: SubsystemNamespace;
  visible: boolean;
  hasCustomView: boolean;
  /** Subsystem attribute keys that contain device address lists */
  deviceAttributes: readonly string[];
}

/**
 * Ordered list of visible subsystems for the services page sidebar.
 */
export const subsystemConfigs: SubsystemConfigEntry[] = [
  {
    name: 'Alarms',
    slug: 'alarms',
    icon: 'icon-app-alarm-2',
    namespace: AlarmSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [SecuritySubsystem.ATTR_SECURITYDEVICES, SafetySubsystem.ATTR_TOTALDEVICES],
  },
  {
    name: 'Cameras',
    slug: 'cameras',
    icon: 'icon-platform-camera-2',
    namespace: CamerasSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [CamerasSubsystem.ATTR_CAMERAS],
  },
  {
    name: 'Care',
    slug: 'care',
    icon: 'icon-app-care-heart-2',
    namespace: CareSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [CareSubsystem.ATTR_CAREDEVICES],
  },
  {
    name: 'Climate',
    slug: 'climate',
    icon: 'icon-app-climate-1',
    namespace: ClimateSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [ClimateSubsystem.ATTR_CONTROLDEVICES, ClimateSubsystem.ATTR_TEMPERATUREDEVICES],
  },
  {
    name: 'Doors & Locks',
    slug: 'doors-locks',
    icon: 'icon-platform-lock-2',
    namespace: DoorsNLocksSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [
      DoorsNLocksSubsystem.ATTR_LOCKDEVICES,
      DoorsNLocksSubsystem.ATTR_MOTORIZEDDOORDEVICES,
      DoorsNLocksSubsystem.ATTR_CONTACTSENSORDEVICES,
      DoorsNLocksSubsystem.ATTR_PETDOORDEVICES,
    ],
  },
  {
    name: 'Home & Family',
    slug: 'home-family',
    icon: 'icon-app-family-2',
    namespace: PresenceSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [PresenceSubsystem.ATTR_ALLDEVICES],
  },
  {
    name: 'Lawn & Garden',
    slug: 'lawn-garden',
    icon: 'icon-app-lawn-1',
    namespace: LawnNGardenSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: true,
    deviceAttributes: [LawnNGardenSubsystem.ATTR_CONTROLLERS],
  },
  {
    name: 'Lights & Switches',
    slug: 'lights-switches',
    icon: 'icon-platform-light-2',
    namespace: LightsNSwitchesSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: false,
    deviceAttributes: [LightsNSwitchesSubsystem.ATTR_SWITCHDEVICES],
  },
  {
    name: 'Water',
    slug: 'water',
    icon: 'icon-platform-irrigation-2',
    namespace: WaterSubsystem.NAMESPACE,
    visible: true,
    hasCustomView: false,
    deviceAttributes: [WaterSubsystem.ATTR_WATERDEVICES],
  },
];

/**
 * Look up config by slug.
 */
export function getSubsystemConfigBySlug(slug: string): SubsystemConfigEntry | undefined {
  return subsystemConfigs.find((c) => c.slug === slug);
}

/**
 * Look up config by namespace prefix (e.g., 'subalarm').
 */
export function getSubsystemConfigByNamespace(ns: SubsystemNamespace): SubsystemConfigEntry | undefined {
  return subsystemConfigs.find((c) => c.namespace === ns);
}
