/**
 * The signed-in person for `auth.person`.
 *
 * `sess:SessionCreated` carries the person's id but not their name, email or
 * phone, which the Profile tab reads from `auth.person`. Every way of signing
 * in (sign-in, session restore, sign-up, accepting an invitation) merges the
 * full person into the session payload before `loginSuccess`, through these
 * helpers, so the profile isn't blank until the next page load.
 */

import Bridge from '@arcus/core/bridge';
import { Base } from '@arcus/core';
import type { SessionCreatedEvent } from '@/arcus/types';
import type { PersonData } from '@/store/entityTypes';

/**
 * Fetch the person's attributes. The platform rejects this until
 * `SetActivePlace` has resolved, so call it after that. Never rejects: on
 * failure it logs and resolves to null, and the session payload is used alone.
 */
export async function fetchSessionPerson(personId: string): Promise<PersonData | null> {
  try {
    return await Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {});
  } catch (e) {
    console.error('Failed to load person attributes:', e);
    return null;
  }
}

/** The session payload with the person's attributes merged over it, for `loginSuccess`. */
export function withSessionPerson(session: SessionCreatedEvent, person: PersonData | null | undefined): SessionCreatedEvent {
  return person ? { ...session, ...person } : session;
}
