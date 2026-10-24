/**
 * Response shapes for the platform services in this package.
 *
 * These live in @arcus/core (not the app) so the services can type their
 * results without importing from the application — the dependency only runs
 * app → core. The app re-exports them from `src/arcus/types.ts`.
 */

// ── Session service ───────────────────────────────────────────────

export interface AvailablePlace {
  placeId: string;
  name: string;
  role: string;
}

export interface ListAvailablePlacesResponse {
  places: AvailablePlace[];
}

/** CardPreference from the platform Preferences type. */
export interface CardPreference {
  serviceName: string;
  hideCard: boolean;
}

/**
 * Preferences stored per-person per-place.
 *
 * The platform allows arbitrary keys but these are the known fields
 * used by the web and mobile clients.
 */
export interface Preferences {
  hideTutorials?: boolean;
  dashboardCards?: CardPreference[];
  /** Web client: ordered card keys for the dashboard. */
  'dashboard:cards'?: string[];
  /** Web client: card keys hidden from the dashboard. */
  'dashboard:hidden'?: string[];
  [key: string]: unknown;
}

export interface GetPreferencesResponse {
  prefs: Preferences;
}

// ── Invitation service ────────────────────────────────────────────

/** An invitation to join a place, as returned by the invite and person services. */
export interface Invitation {
  code: string;
  placeId: string;
  placeName: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  stateProv?: string;
  zipCode?: string;
  inviteeEmail: string;
  inviteeFirstName: string;
  inviteeLastName: string;
  invitorFirstName: string;
  invitorLastName: string;
  invitationText?: string;
  personalizedGreeting?: string;
  [key: string]: unknown;
}

export interface GetInvitationResponse {
  invitation: Invitation;
}
