/**
 * Shared Arcus platform API response types.
 *
 * These interfaces describe the response payloads returned by Bridge.request<T>()
 * and Bridge.restfulRequest<T>() for the various Arcus platform message types.
 *
 * Field definitions sourced from arcusplatform capability/service XML definitions
 * and Java handler implementations.
 */

import type { Invitation } from '@/store/slices/invitationsSlice';
import type { ArcusPayload, PersonData, PlaceData, AccountData, PairingDevice, PairingProduct } from '@/store/entityTypes';
import type { PairingStep } from '@/components/pairing/types';
import type { HistoryEntry } from '@/components/history/HistoryList';

// ── Session / auth types ──────────────────────────────────────────

/** A place entry from the SessionCreated event's `places` array. */
export interface SessionPlace {
  placeId: string;
  placeName: string;
  accountId: string;
  role: string;
  promonAdEnabled?: string;
}

/**
 * SessionCreated event payload — emitted by the platform when a WebSocket
 * session is established. Fields sourced from HandshakeSessionListener.java.
 *
 * Stored in authSlice as `person`.
 */
export type SessionCreatedEvent = PersonData & {
  personId: string;
  places: SessionPlace[];
  // Config URLs
  smartyAuthID?: string;
  smartyAuthToken?: string;
  tokenURL?: string;
  publicKey?: string;
  cameraPreviewBaseUrl?: string;
  staticResourceBaseUrl?: string;
  secureStaticResourceBaseUrl?: string;
  redirectBaseUrl?: string;
  androidLaunchUrl?: string;
  iosLaunchUrl?: string;
  webLaunchUrl?: string;
  // Consent flags
  requiresTermsAndConditionsConsent?: boolean;
  requiresPrivacyPolicyConsent?: boolean;
};

/**
 * Account object attributes from `base:GetAttributes` on SERV:account:*.
 * Fields sourced from accountbase.xml capability definition.
 */
export type Account = AccountData;

// ── Place capability responses ────────────────────────────────────

export interface ListDevicesResponse {
  devices: ArcusPayload[];
}

export interface ListPersonsResponse {
  persons: PersonData[];
}

export interface GetHubResponse {
  hub: ArcusPayload;
}

export interface ListHistoryEntriesResponse {
  results: HistoryEntry[];
  nextToken?: string;
}

export const HUB_REGISTRATION_ERRORS = {
  ALREADY_REGISTERED: 'error.register.alreadyregistered',
  ORPHANED_HUB: 'error.register.orphanedhub',
  INVALID_PARAM: 'request.param.invalid',
} as const;

type HubRegistrationError = typeof HUB_REGISTRATION_ERRORS[keyof typeof HUB_REGISTRATION_ERRORS];

export interface RegisterHubV2Response {
  state: 'ONLINE' | 'OFFLINE' | 'DOWNLOADING' | 'APPLYING' | 'REGISTERED' | HubRegistrationError;
  progress: number;
  hub?: ArcusPayload;
}

export interface CreateInvitationResponse {
  invitation: Invitation;
}

// ── Session service responses ─────────────────────────────────────

export interface ListAvailablePlacesResponse {
  places: AvailablePlace[];
}

export interface AvailablePlace {
  placeId: string;
  name: string;
  role: string;
}

// ── Account capability responses ──────────────────────────────────

export interface AddPlaceResponse {
  place: PlaceData;
}

// ── Person capability responses ───────────────────────────────────

export interface PendingInvitationsResponse {
  invitations: Invitation[];
}

// ── Invitation service responses ──────────────────────────────────

export interface GetInvitationResponse {
  invitation: Invitation;
}

// ── Pairing subsystem responses ───────────────────────────────────

export interface ListPairingDevicesResponse {
  devices: PairingDevice[];
}

export interface GetKitInformationResponse {
  kitInfo: KitDevice[];
}

export interface KitDevice {
  productId: string;
  protocolAddress: string;
}

export interface StartPairingResponse {
  steps: PairingStep[];
  mode: 'HUB' | 'CLOUD' | 'OAUTH';
  video?: string;
  form?: PairingInput[];
  oauthUrl?: string;
  oauthStyle?: string;
}

export interface PairingInput {
  type: 'TEXT' | 'HIDDEN';
  name: string;
  label: string;
  value?: string;
  minlen?: number;
  maxlen?: number;
  required?: boolean;
}

// ── Scene template responses ──────────────────────────────────────

export interface ResolveActionsResponse {
  actions: RawAction[];
}

export interface RawAction {
  id: string;
  name: string;
  satisfiable: boolean;
  premium: boolean;
  typehint?: string;
  selectors?: Record<string, ActionSelector[]>;
}

/** Raw ActionSelector from scenetmpl:ResolveActions, before client-side transformation. */
export interface ActionSelector {
  type: string;
  name: string;
  value?: unknown;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

// ── Professional monitoring responses ─────────────────────────────

export interface PromonSettingsResponse {
  'promon:testCallStatus'?: string;
  'promon:testCallTime'?: number;
}
