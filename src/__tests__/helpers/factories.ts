/**
 * Shared test factory functions for creating entity fixtures.
 */

import { Base } from '@arcus/core';
import type {
  DeviceEntity,
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
