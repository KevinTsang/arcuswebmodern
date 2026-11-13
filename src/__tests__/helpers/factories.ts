/**
 * Shared test factory functions for creating entity fixtures.
 */

import { Base, PairingDevice as PairingDeviceCap } from '@arcus/core';
import type {
  DeviceEntity,
  PairingDevice,
  SubsystemEntity,
  IncidentEntity,
  SceneEntity,
  RuleEntity,
  PersonEntity,
} from '@/store/entityTypes';

export function makeDevice(address: string, overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

export function makeSubsystem(address: string, overrides: Record<string, unknown> = {}): SubsystemEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

export function makeIncident(address: string, overrides: Partial<IncidentEntity> = {}): IncidentEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

export function makeScene(address: string, overrides: Partial<SceneEntity> = {}): SceneEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

export function makeRule(address: string, overrides: Partial<RuleEntity> = {}): RuleEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

export function makePerson(address: string, overrides: Partial<PersonEntity> = {}): PersonEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...overrides,
  };
}

/** Pairing phase that goes with each pairing state. */
const PAIRING_PHASE: Record<string, string> = {
  [PairingDeviceCap.PAIRINGSTATE_PAIRING]: PairingDeviceCap.PAIRINGPHASE_JOIN,
  [PairingDeviceCap.PAIRINGSTATE_PAIRED]: PairingDeviceCap.PAIRINGPHASE_PAIRED,
  [PairingDeviceCap.PAIRINGSTATE_MISPAIRED]: PairingDeviceCap.PAIRINGPHASE_FAILED,
  [PairingDeviceCap.PAIRINGSTATE_MISCONFIGURED]: PairingDeviceCap.PAIRINGPHASE_FAILED,
};

/** Pairing record `SERV:pairdev:<id>` for the device `DRIV:dev:<id>`, not yet customized. */
export function makePairingDevice(id: string, state: string, overrides: Partial<PairingDevice> = {}): PairingDevice {
  return {
    [Base.ATTR_ADDRESS]: `SERV:pairdev:${id}`,
    [PairingDeviceCap.ATTR_PAIRINGSTATE]: state,
    [PairingDeviceCap.ATTR_PAIRINGPHASE]: PAIRING_PHASE[state] ?? PairingDeviceCap.PAIRINGPHASE_JOIN,
    [PairingDeviceCap.ATTR_DEVICEADDRESS]: `DRIV:dev:${id}`,
    [PairingDeviceCap.ATTR_CUSTOMIZATIONS]: [],
    ...overrides,
  };
}
