import Bridge from '@arcus/core/bridge';
import { Base, Person } from '@arcus/core';
import { addNotification } from '@/store/slices/uiSlice';
import type { AppDispatch } from '@/store/store';
import type { PersonData } from '@/store/entityTypes';

export type ContactField =
  | typeof Person.ATTR_FIRSTNAME
  | typeof Person.ATTR_LASTNAME
  | typeof Person.ATTR_MOBILENUMBER;

/** The person attributes the contact panel edits, keyed by attribute name. */
export type ContactValues = Record<ContactField, string>;

/** The person as loaded from the platform, for the person id it was loaded for. */
export type ContactLoad =
  | { status: 'ready'; personId: string; loaded: ContactValues }
  | { status: 'error'; personId: string };

/**
 * Loads the person's contact attributes. auth.person may be just the session
 * payload (no names), so the form is never seeded from it. Never rejects: a
 * failure dispatches an error notification and resolves to `error`.
 */
export async function loadContactInfo(personId: string, dispatch: AppDispatch): Promise<ContactLoad> {
  try {
    const attrs = await Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {});
    return {
      status: 'ready',
      personId,
      loaded: {
        [Person.ATTR_FIRSTNAME]: attrs[Person.ATTR_FIRSTNAME] ?? '',
        [Person.ATTR_LASTNAME]: attrs[Person.ATTR_LASTNAME] ?? '',
        [Person.ATTR_MOBILENUMBER]: attrs[Person.ATTR_MOBILENUMBER] ?? '',
      },
    };
  } catch {
    dispatch(addNotification({ type: 'error', message: 'Failed to load contact info.' }));
    return { status: 'error', personId };
  }
}
