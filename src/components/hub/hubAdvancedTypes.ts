import {
  Base, CellBackupSubsystem, Hub, Hub4g, HubNetwork, HubSounds, HubVolume, HubZigbee, HubZwave,
} from '@arcus/core';

/**
 * A JSON value as the platform returns it for attributes it declares as
 * `object` (the per-node Z-Wave maps): the shape depends on the hub firmware,
 * so it is rendered generically rather than assumed.
 */
export type PlatformJson =
  | string
  | number
  | boolean
  | null
  | PlatformJson[]
  | { [key: string]: PlatformJson };

/** A map keyed by Z-Wave node id. */
export interface NodeMap {
  [nodeId: string]: PlatformJson;
}

/** hubzwave:NetworkInformation response. */
export interface ZWaveNetworkInformation {
  metrics?: NodeMap;
  neighbors?: NodeMap;
  routing?: NodeMap;
  route?: NodeMap;
  zombies?: PlatformJson;
  graph?: string;
}

/** hubzigbee:GetStats response: counters kept by the Zigbee chip. */
export interface ZigbeeStatsResponse {
  stats?: { [counter: string]: number };
}

/** The hub attributes the advanced hub page reads. */
export interface HubAdvancedAttributes {
  [Base.ATTR_ADDRESS]: string;
  [Hub.ATTR_STATE]?: string;
  [HubVolume.ATTR_VOLUME]?: string;
  [HubSounds.ATTR_PLAYING]?: boolean;
  [HubNetwork.ATTR_TYPE]?: string;
  [Hub4g.ATTR_PRESENT]?: boolean;
  [Hub4g.ATTR_SIMPRESENT]?: boolean;
  [Hub4g.ATTR_SIMPROVISIONED]?: boolean;
  [Hub4g.ATTR_SIMDISABLED]?: boolean;
  [Hub4g.ATTR_CONNECTIONSTATE]?: string;
  [Hub4g.ATTR_VENDOR]?: string;
  [Hub4g.ATTR_MODEL]?: string;
  [Hub4g.ATTR_IMEI]?: string;
  [Hub4g.ATTR_ICCID]?: string;
  [Hub4g.ATTR_SIGNALBARS]?: number;
  [HubZwave.ATTR_HOMEID]?: string;
  [HubZwave.ATTR_FIRMWARE]?: string;
  [HubZwave.ATTR_PROTOCOL]?: string;
  [HubZwave.ATTR_NUMDEVICES]?: number;
  [HubZwave.ATTR_ISSUC]?: boolean;
  [HubZwave.ATTR_ISSECONDARY]?: boolean;
  [HubZwave.ATTR_STATE]?: string;
  [HubZwave.ATTR_HEALINPROGRESS]?: boolean;
  [HubZwave.ATTR_HEALPERCENT]?: number;
  [HubZwave.ATTR_HEALLASTFINISH]?: number;
  [HubZwave.ATTR_HEALRECOMMENDED]?: boolean;
  [HubZigbee.ATTR_CHANNEL]?: number;
  [HubZigbee.ATTR_PANID]?: number;
  [HubZigbee.ATTR_POWER]?: number;
  [HubZigbee.ATTR_POWERMODE]?: string;
  [HubZigbee.ATTR_STATE]?: string;
  [HubZigbee.ATTR_VERSION]?: string;
}

/** The CellBackupSubsystem attributes the cellular backup card reads. */
export interface CellBackupAttributes {
  [Base.ATTR_ADDRESS]: string;
  [CellBackupSubsystem.ATTR_STATUS]?: string;
  [CellBackupSubsystem.ATTR_ERRORSTATE]?: string;
  [CellBackupSubsystem.ATTR_NOTREADYSTATE]?: string;
}
