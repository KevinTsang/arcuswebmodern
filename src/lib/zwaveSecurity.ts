/**
 * Z-Wave security class a device was granted, from `devadv:protocolAttrs`.
 *
 * `ZWAV:Security` is the highest class the hub granted and
 * `ZWAV:SecurityRequested` the highest the device asked for. A missing
 * `ZWAV:Security` means unknown (older hubs don't send it), not NONE.
 */

import { ZWaveProtocol } from '@arcus/core';

/** `devadv:protocolAttrs`: protocol attribute name → value. */
export interface ProtocolAttrs {
  [ZWaveProtocol.ATTR_SECURITY]?: string;
  [ZWaveProtocol.ATTR_SECURITYREQUESTED]?: string;
  [name: string]: string | undefined;
}

const RANK: Readonly<Record<string, number>> = {
  [ZWaveProtocol.SECURITY_NONE]: 0,
  [ZWaveProtocol.SECURITY_S0]: 1,
  [ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED]: 2,
  [ZWaveProtocol.SECURITY_S2_AUTHENTICATED]: 3,
  [ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL]: 4,
};

const LABEL: Readonly<Record<string, string>> = {
  [ZWaveProtocol.SECURITY_NONE]: 'None',
  [ZWaveProtocol.SECURITY_S0]: 'S0 (legacy)',
  [ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED]: 'S2 Unauthenticated',
  [ZWaveProtocol.SECURITY_S2_AUTHENTICATED]: 'S2 Authenticated',
  [ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL]: 'S2 Access Control',
};

export interface ZWaveSecurityInfo {
  /** Granted class, or null when the hub didn't report it. */
  granted: string | null;
  /** Requested class, or null when the hub doesn't know. */
  requested: string | null;
  /** True when the device was granted less than it asked for. */
  downgraded: boolean;
}

/** Display name for a security class value. Unknown values are shown as sent. */
export function securityClassLabel(value: string): string {
  return LABEL[value] ?? value;
}

/** Security info for a device, or null when it reports neither attribute. */
export function zwaveSecurityInfo(attrs: ProtocolAttrs | null | undefined): ZWaveSecurityInfo | null {
  const granted = attrs?.[ZWaveProtocol.ATTR_SECURITY] || null;
  const requested = attrs?.[ZWaveProtocol.ATTR_SECURITYREQUESTED] || null;
  if (!granted && !requested) return null;
  const grantedRank = granted != null ? RANK[granted] : undefined;
  const requestedRank = requested != null ? RANK[requested] : undefined;
  const downgraded = grantedRank !== undefined && requestedRank !== undefined && requestedRank > grantedRank;
  return { granted, requested, downgraded };
}
