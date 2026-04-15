/**
 * Shared entity types for Redux slices.
 *
 * Uses constants from @arcus/core for property keys via `typeof` so that
 * type definitions stay in sync with the capability constants. TypeScript
 * interfaces cannot use computed property names, so these are type aliases
 * built with Record and Partial mapped types.
 */

import {
  Base, Device, DeviceConnection, DevicePower, DeviceAdvanced,
  Scene, Rule, RuleTemplate, Person, AlarmIncident, Place,
  Account,
  PairingDevice as PairingDeviceCap, Product,
} from '@arcus/core';

/**
 * Base type shared by all Arcus platform entities stored in Redux.
 * Every entity has an `id` (set to its address) and `base:address`.
 */
export type ArcusEntity = {
  id: string;
  [key: string]: unknown;
} & Record<typeof Base.ATTR_ADDRESS, string>;

/**
 * Payload shape for single-entity updates from the platform.
 * Every update payload includes at minimum the entity address.
 */
export type ArcusPayload = Record<typeof Base.ATTR_ADDRESS, string> & Record<string, unknown>;

/** Device entity with commonly accessed capability attributes. */
export type DeviceEntity = ArcusEntity & Partial<
  Record<typeof Base.ATTR_ID, string> &
  Record<typeof Base.ATTR_CAPS, string[]> &
  Record<typeof Base.ATTR_INSTANCES, Record<string, string[]>> &
  Record<typeof Device.ATTR_NAME, string> &
  Record<typeof Device.ATTR_DEVTYPEHINT, string> &
  Record<typeof Device.ATTR_PRODUCTID, string> &
  Record<typeof Device.ATTR_VENDOR, string> &
  Record<typeof Device.ATTR_MODEL, string> &
  Record<typeof DeviceConnection.ATTR_STATE, string> &
  Record<typeof DeviceAdvanced.ATTR_ERRORS, Record<string, string>> &
  Record<typeof DevicePower.ATTR_BATTERY, number> &
  Record<typeof DevicePower.ATTR_SOURCE, string>
>;

/** Scene entity with known scene attributes. */
export type SceneEntity = ArcusEntity & Partial<
  Record<typeof Scene.ATTR_NAME, string> &
  Record<typeof Scene.ATTR_ENABLED, boolean> &
  Record<typeof Scene.ATTR_ACTIONS, Array<Record<string, unknown>>> &
  Record<typeof Scene.ATTR_NOTIFICATION, boolean> &
  Record<typeof Scene.ATTR_TEMPLATE, string> &
  Record<typeof Scene.ATTR_SCHEDULER, string> &
  Record<typeof Scene.ATTR_FIRING, boolean> &
  Record<typeof Scene.ATTR_FILTERUNCHANGED, boolean> &
  Record<typeof Scene.ATTR_LASTFIRETIME, number> &
  Record<typeof Scene.ATTR_LASTFIRESTATUS, string>
>;

/** Rule entity with known rule attributes. */
export type RuleEntity = ArcusEntity & Partial<
  Record<typeof Rule.ATTR_NAME, string> &
  Record<typeof Rule.ATTR_DESCRIPTION, string> &
  Record<typeof Rule.ATTR_STATE, string> &
  Record<typeof Rule.ATTR_TEMPLATE, string> &
  Record<typeof Rule.ATTR_CONTEXT, Record<string, unknown>>
>;

/** Rule template entity from the platform rule template catalog. */
export type RuleTemplateEntity = ArcusEntity & Partial<
  Record<typeof RuleTemplate.ATTR_NAME, string> &
  Record<typeof RuleTemplate.ATTR_DESCRIPTION, string> &
  Record<typeof RuleTemplate.ATTR_TEMPLATE, string> &
  Record<typeof RuleTemplate.ATTR_CATEGORIES, string[]> &
  Record<typeof RuleTemplate.ATTR_KEYWORDS, string[]> &
  Record<typeof RuleTemplate.ATTR_SATISFIABLE, boolean> &
  Record<typeof RuleTemplate.ATTR_PREMIUM, boolean> &
  Record<typeof RuleTemplate.ATTR_EXTRA, string>
>;

/** Person entity with known person attributes. */
export type PersonEntity = ArcusEntity & Partial<
  Record<typeof Base.ATTR_ID, string> &
  Record<typeof Person.ATTR_FIRSTNAME, string> &
  Record<typeof Person.ATTR_LASTNAME, string> &
  Record<typeof Person.ATTR_EMAIL, string> &
  Record<typeof Person.ATTR_MOBILENUMBER, string>
>;

/** Alarm incident entity. */
export type IncidentEntity = ArcusEntity & Partial<
  Record<typeof AlarmIncident.ATTR_ALERTSTATE, string> &
  Record<typeof AlarmIncident.ATTR_ALERT, string>
>;

/** Subsystem entity — properties vary by subsystem type. */
export type SubsystemEntity = ArcusEntity;

/** Care behavior from CareSubsystem. */
export interface CareBehavior {
  name?: string;
  description?: string;
  enabled?: boolean;
  type?: string;
}

/** Alarm call tree entry from AlarmSubsystem / SecuritySubsystem. */
export interface AlarmCallEntry {
  person?: string;
  enabled?: boolean;
}

/** Care call tree entry from CareSubsystem. */
export interface CareCallEntry {
  person?: string;
  enabled?: boolean;
}

/** Chime configuration from DoorsNLocksSubsystem. */
export type ChimeConfig = Record<string, boolean>;

/** Zone watering entry from LawnNGardenSubsystem. */
export interface ZoneWateringEntry {
  zoneName?: string;
  zoneNumber?: number;
  duration?: number;
}

/** Next scheduled event from LawnNGardenSubsystem. */
export interface LawnGardenEvent {
  zoneName?: string;
  startTime?: number;
  duration?: number;
}

/** Scheduler entity. */
export type SchedulerEntity = ArcusEntity;

// ── API response / data types ────────────────────────────────────────
// These describe data shapes from the platform API before they enter Redux.
// They use the same constant-backed property keys but lack the `id` field
// that the entity adapter adds.

/** Person data from API responses. */
export type PersonData = ArcusPayload & Partial<
  Record<typeof Base.ATTR_ID, string> &
  Record<typeof Person.ATTR_FIRSTNAME, string> &
  Record<typeof Person.ATTR_LASTNAME, string> &
  Record<typeof Person.ATTR_EMAIL, string> &
  Record<typeof Person.ATTR_MOBILENUMBER, string>
>;

/** Place data from API responses. */
export type PlaceData = ArcusPayload
  & Record<typeof Base.ATTR_ID, string>
  & Partial<
    Record<typeof Place.ATTR_NAME, string> &
    Record<typeof Place.ATTR_STREETADDRESS1, string> &
    Record<typeof Place.ATTR_STREETADDRESS2, string> &
    Record<typeof Place.ATTR_CITY, string> &
    Record<typeof Place.ATTR_STATEPROV, string> &
    Record<typeof Place.ATTR_ZIPCODE, string> &
    Record<typeof Place.ATTR_SERVICELEVEL, string>
  >;

/** Account data from API responses. */
export type AccountData = ArcusPayload
  & Record<typeof Account.ATTR_STATE, string>
  & Record<typeof Account.ATTR_OWNER, string>
  & Partial<
    Record<typeof Account.ATTR_TAXEXEMPT, boolean> &
    Record<typeof Account.ATTR_BILLINGFIRSTNAME, string> &
    Record<typeof Account.ATTR_BILLINGLASTNAME, string> &
    Record<typeof Account.ATTR_BILLINGCCTYPE, string> &
    Record<typeof Account.ATTR_BILLINGCCLAST4, string> &
    Record<typeof Account.ATTR_BILLINGSTREET1, string> &
    Record<typeof Account.ATTR_BILLINGSTREET2, string> &
    Record<typeof Account.ATTR_BILLINGCITY, string> &
    Record<typeof Account.ATTR_BILLINGSTATE, string> &
    Record<typeof Account.ATTR_BILLINGZIP, string> &
    Record<typeof Account.ATTR_BILLINGZIPPLUSFOUR, string> &
    Record<typeof Account.ATTR_CREATED, number> &
    Record<typeof Account.ATTR_MODIFIED, number>
  >;

/** Pairing device data from API responses. */
export type PairingDevice = ArcusPayload
  & Record<typeof PairingDeviceCap.ATTR_PAIRINGSTATE, string>
  & Record<typeof PairingDeviceCap.ATTR_PAIRINGPHASE, string>
  & Partial<
    Record<typeof PairingDeviceCap.ATTR_PRODUCTADDRESS, string> &
    Record<typeof PairingDeviceCap.ATTR_DEVICEADDRESS, string> &
    Record<typeof PairingDeviceCap.ATTR_CUSTOMIZATIONS, string[]>
  >;

/** Pairing product data from API responses. */
export type PairingProduct = ArcusPayload
  & Record<typeof Product.ATTR_NAME, string>
  & Record<typeof Product.ATTR_VENDOR, string>
  & Record<typeof Product.ATTR_HUBREQUIRED, boolean>
  & Record<typeof Product.ATTR_ID, string>
  & Partial<
    Record<typeof Product.ATTR_PAIRINGMODE, string> &
    Record<typeof Product.ATTR_APPREQUIRED, boolean>
  >;
