/**
 * @arcus/core — Shared platform communication layer.
 *
 * This package is consumed by both the legacy CanJS app (via thin adapters)
 * and the new Next.js app.
 */

export { Cornea, default as cornea } from './cornea';
export type { CorneaMessage, EventSubject } from './cornea';

export { default as Bridge } from './bridge';
export type { BridgeConfig } from './bridge';

export { Backoff } from './backoff';
export type { BackoffOptions } from './backoff';

export { default as propertyAliases } from './property-aliases';
export type { PropertyAliasMap } from './property-aliases';

export { default as auth } from './auth';

export { setConfig, getConfig } from './config';
export type { ArcusCoreConfig } from './config';

// Services (Phase 2)
export { services } from './services';
export {
  AccountService,
  AlarmService,
  BridgeService,
  DeviceService,
  EasCodeService,
  I18NService,
  InvitationService,
  IpcdService,
  NwsSameCodeService,
  PairingDeviceService,
  PersonService,
  PlaceService,
  ProductCatalogService,
  ProMonitoringService,
  RuleService,
  SceneService,
  SchedulerService,
  SessionService,
  SubsystemService,
  SupportSearchService,
  SupportSessionService,
  VideoService,
} from './services';

// Capabilities (Phase 3) — auto-generated from XML definitions
export * from './capabilities/capabilities';
