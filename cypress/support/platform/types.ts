/**
 * Shared types for the in-browser fake Arcus platform used by the E2E suite.
 */

export type Json = string | number | boolean | null | undefined | Json[] | { [key: string]: Json };

/** Attribute map exchanged with the platform (message payloads, entities). */
export type Attrs = { [key: string]: Json };

/** A client → platform request, as sent over the WebSocket or the REST bridge. */
export interface RequestEnvelope {
  type: string;
  headers: {
    destination: string;
    correlationId?: string;
    isRequest?: boolean;
  };
  payload: {
    messageType: string;
    attributes: Attrs;
  };
}

/** A platform → client message (response, error or event). */
export interface ResponseEnvelope {
  type: string;
  headers: {
    isRequest: false;
    correlationId?: string;
    source?: string;
    destination?: string;
  };
  payload: {
    messageType: string;
    attributes: Attrs;
    code?: string;
  };
}

/** A request observed by the fake platform, kept for assertions. */
export interface LoggedRequest {
  type: string;
  destination: string;
  attributes: Attrs;
  transport: 'ws' | 'rest';
}

/** What a request handler receives. */
export interface HandlerContext {
  type: string;
  destination: string;
  attrs: Attrs;
}

/** Return value of a handler: response attributes (undefined → empty response). */
export type Handler = (ctx: HandlerContext) => Attrs | undefined;

/** Error a handler (or `platform.failRequest`) raises to simulate a platform error. */
export class PlatformFailure extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

export interface SessionPlaceFixture {
  placeId: string;
  placeName: string;
  accountId: string;
  role: string;
}

export interface HistoryEntryFixture {
  timestamp: number;
  subjectName: string;
  subjectAddress: string;
  longMessage: string;
}

export interface InvitationFixture {
  code: string;
  placeId: string;
  placeName: string;
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  invitorFirstName: string;
  invitorLastName: string;
  streetAddress1?: string;
  city?: string;
  stateProv?: string;
  zipCode?: string;
}

export interface ApiKeyFixture {
  id: string;
  label: string;
  keyPrefix: string;
  permissions: string[];
  created: number | null;
  lastUsed: number | null;
  expiresAt: number | null;
  expired: boolean;
}

export interface KitDeviceFixture {
  productId: string;
  protocolAddress: string;
}

/** Everything the fake platform serves for one signed-in person. */
export interface PlatformData {
  /** Credentials accepted by `POST /login`. */
  login: { email: string; password: string };
  personId: string;
  placeId: string;
  accountId: string;
  places: SessionPlaceFixture[];
  /** Every entity by `base:address` (devices, subsystems, scenes, rules, …). */
  entities: { [address: string]: Attrs };
  preferences: Attrs;
  history: HistoryEntryFixture[];
  products: Attrs[];
  /** Resolved selectors returned for `ruletmpl:Resolve`, keyed by template address. */
  ruleSelectors: { [templateAddress: string]: Attrs };
  /** Raw actions returned for `scenetmpl:ResolveActions`. */
  sceneActions: Attrs[];
  /** Pending invitations for the signed-in person (`person:PendingInvitations`). */
  invitations: InvitationFixture[];
  /** Invitations that can be looked up by code (`invite:GetInvitation`). */
  invitationCodes: { [code: string]: InvitationFixture };
  apiKeys: ApiKeyFixture[];
  kitInfo: KitDeviceFixture[];
}
