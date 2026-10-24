/**
 * Session flow shared by loginThunk and authenticateThunk, so login and
 * session restore can't drift apart.
 *
 * Follows the arcusweb flow (auth → SessionCreated → SetActivePlace):
 * 1. Start the auth attempt and wait for SessionCreated ({ personId, places[] })
 * 2. Pick the default place and scope the platform session to it
 * 3. Load the account for that place and the signed-in person
 * 4. Dispatch loginSuccess
 */

import type { Dispatch } from '@reduxjs/toolkit';
import auth from '@arcus/core/auth';
import Bridge from '@arcus/core/bridge';
import { Base } from '@arcus/core';
import { SessionService } from '@arcus/core/services';
import type { SessionCreatedEvent, Account } from '@/arcus/types';
import type { PersonData } from '@/store/entityTypes';
import { loginSuccess } from '../slices/authSlice';
import { getDefaultPlaceId } from './placeSelection';

/**
 * A sign-in step that failed, with the raw rejection value. Cornea rejects
 * with the platform's error attributes, which can be just `{}`, so the step
 * name is often the only clue to why a session restore failed.
 */
export class SessionStepError extends Error {
  constructor(readonly step: string, readonly reason: unknown) {
    super(`Sign-in step "${step}" failed`);
    this.name = 'SessionStepError';
  }
}

/** Await one sign-in step, tagging a rejection with the step's name. */
async function runStep<T>(step: string, work: Promise<T>): Promise<T> {
  try {
    return await work;
  } catch (reason) {
    throw new SessionStepError(step, reason);
  }
}

/**
 * Start an auth attempt and resolve with the platform's SessionCreated
 * payload. The auth listeners are removed however the attempt ends.
 */
export function waitForSession(
  start: () => Promise<void>,
  failMessage: string,
): Promise<SessionCreatedEvent> {
  return new Promise<SessionCreatedEvent>((resolve, reject) => {
    const detach = () => {
      auth.off('authentication:success', onSuccess);
      auth.off('authentication:fail', onFail);
    };
    const onSuccess = (data: SessionCreatedEvent) => {
      detach();
      resolve(data);
    };
    const onFail = () => {
      detach();
      reject(new SessionStepError('SessionCreated', new Error(failMessage)));
    };

    auth.on('authentication:success', onSuccess);
    auth.on('authentication:fail', onFail);

    start().catch((reason) => {
      detach();
      reject(new SessionStepError('connect', reason));
    });
  });
}

/**
 * Finish signing in once SessionCreated has arrived: scope the session to the
 * default place, load the account and person, and dispatch loginSuccess.
 * Returns the selected placeId.
 */
export async function completeSession(
  session: SessionCreatedEvent,
  dispatch: Dispatch,
): Promise<string | undefined> {
  const { personId, places = [] } = session;

  // Determine default place (same logic as arcusweb PlaceManager)
  const placeId = getDefaultPlaceId(places, personId);

  if (placeId) {
    // Scope the platform session to this place
    await runStep('SetActivePlace', SessionService.SetActivePlace(placeId));
    // Persist for session restore
    localStorage.setItem(`arcus:placeId`, placeId);
  }

  const selectedPlace = places.find((p) => p.placeId === placeId);
  if (!selectedPlace?.accountId) {
    throw new SessionStepError('account', new Error('No account found for the selected place'));
  }

  // SessionCreated only carries personId, not name/email/phone. The platform
  // rejects the person fetch until SetActivePlace has resolved, so fetch it
  // now, alongside the account. It's optional: a failure falls back to the
  // session payload.
  const personRequest = Bridge.request<PersonData>(Base.CMD_GETATTRIBUTES, `SERV:person:${personId}`, {})
    .catch((e) => {
      console.error('Failed to load person attributes:', e);
      return null;
    });

  // Fetch the account object for the selected place
  const account = await runStep('account', Bridge.request<Account>(
    Base.CMD_GETATTRIBUTES,
    `SERV:account:${selectedPlace.accountId}`,
    {},
  ));
  const person = await personRequest;

  dispatch(loginSuccess({ person: { ...session, ...person }, account }));
  return placeId;
}
