/**
 * Subsystem configuration — ported from config/subsystem.json.
 *
 * Maps subsystem namespace prefixes to display metadata (name, slug,
 * icon) and defines which subsystems are visible and have custom views.
 */

export interface SubsystemConfigEntry {
  name: string;
  slug: string;
  icon: string;
  namespace: string;
  visible: boolean;
  hasCustomView: boolean;
  /** Subsystem attribute keys that contain device address lists */
  deviceAttributes: string[];
}

/**
 * Ordered list of visible subsystems for the services page sidebar.
 */
export const subsystemConfigs: SubsystemConfigEntry[] = [
  {
    name: 'Alarms',
    slug: 'alarms',
    icon: 'icon-app-alarm-2',
    namespace: 'subalarm',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subsecurity:securityDevices', 'subsafety:totalDevices'],
  },
  {
    name: 'Cameras',
    slug: 'cameras',
    icon: 'icon-platform-camera-2',
    namespace: 'subcameras',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subcameras:cameras'],
  },
  {
    name: 'Care',
    slug: 'care',
    icon: 'icon-app-care-heart-2',
    namespace: 'subcare',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subcare:careDevices'],
  },
  {
    name: 'Climate',
    slug: 'climate',
    icon: 'icon-app-climate-1',
    namespace: 'subclimate',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subclimate:controlDevices', 'subclimate:temperatureDevices'],
  },
  {
    name: 'Doors & Locks',
    slug: 'doors-locks',
    icon: 'icon-platform-lock-2',
    namespace: 'subdoorsnlocks',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subdoorsnlocks:lockDevices', 'subdoorsnlocks:motorizedDoorDevices', 'subdoorsnlocks:contactSensorDevices', 'subdoorsnlocks:petDoorDevices'],
  },
  {
    name: 'Home & Family',
    slug: 'home-family',
    icon: 'icon-app-family-2',
    namespace: 'subspres',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['subspres:allDevices'],
  },
  {
    name: 'Lawn & Garden',
    slug: 'lawn-garden',
    icon: 'icon-app-lawn-1',
    namespace: 'sublawnngarden',
    visible: true,
    hasCustomView: true,
    deviceAttributes: ['sublawnngarden:controllers'],
  },
  {
    name: 'Lights & Switches',
    slug: 'lights-switches',
    icon: 'icon-platform-light-2',
    namespace: 'sublightsnswitches',
    visible: true,
    hasCustomView: false,
    deviceAttributes: ['sublightsnswitches:switchDevices'],
  },
  {
    name: 'Water',
    slug: 'water',
    icon: 'icon-platform-irrigation-2',
    namespace: 'subwater',
    visible: true,
    hasCustomView: false,
    deviceAttributes: ['subwater:waterDevices'],
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
export function getSubsystemConfigByNamespace(ns: string): SubsystemConfigEntry | undefined {
  return subsystemConfigs.find((c) => c.namespace === ns);
}
