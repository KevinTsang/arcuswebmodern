/**
 * Shared types for the in-browser fake Arcus platform used by the E2E suite.
 */

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

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
  longMessage: string;
  [key: string]: Json;
}

/** Everything the fake platform serves for one signed-in person. */
export interface PlatformData {
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
  invitations: Attrs[];
}
