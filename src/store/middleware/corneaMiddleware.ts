/**
 * Redux middleware that bridges Cornea WebSocket events to Redux actions.
 *
 * Replaces the ModelConnection pattern from src/models/base.js (lines 185-242).
 * When the user authenticates, subscribes to Cornea events for all entity
 * namespaces and dispatches the appropriate add/update/remove actions.
 */

import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import cornea from '@arcus/core/cornea';
import propertyAliases from '@arcus/core/property-aliases';
import { Base, Person } from '@arcus/core';
import { loginSuccess, logout } from '../slices/authSlice';
import { deviceAdded, deviceUpdated, deviceRemoved } from '../slices/devicesSlice';
import { subsystemAdded, subsystemUpdated, subsystemRemoved } from '../slices/subsystemsSlice';
import { ruleAdded, ruleUpdated, ruleRemoved } from '../slices/rulesSlice';
import { sceneAdded, sceneUpdated, sceneRemoved } from '../slices/scenesSlice';
import { schedulerAdded, schedulerUpdated, schedulerRemoved } from '../slices/schedulersSlice';
import { incidentAdded, incidentUpdated, incidentRemoved } from '../slices/incidentsSlice';
import { personAdded, personUpdated, personRemoved } from '../slices/peopleSlice';
import { setHub, updateHub, clearHub } from '../slices/hubSlice';
import { setPlace } from '../slices/placeSlice';
import { setInvitations } from '../slices/invitationsSlice';
import Bridge from '@arcus/core/bridge';
import type { PendingInvitationsResponse } from '@/arcus/types';

/**
 * Maps Cornea event namespace prefixes to Redux action creators.
 *
 * Each entry corresponds to a ModelConnection(namespace, ...) call in the
 * original CanJS codebase. The Cornea emits events like:
 *   `${namespace} base:ValueChange`
 *   `${namespace} base:Added`
 *   `${namespace} base:Deleted`
 */
// Cornea event payloads are untyped records from the WebSocket boundary.
// We assert the shape here since all platform messages include 'base:address'.
type CorneaObj = Record<string, any>;

interface EntityActions {
  added: (entity: CorneaObj) => any;
  updated: (entity: CorneaObj) => any;
  removed: (entity: CorneaObj) => any;
}

/** Extract address and build entity with `id` for EntityAdapter. */
function toEntity(obj: CorneaObj) {
  const address = obj[Base.ATTR_ADDRESS] as string;
  return { ...obj, id: address, [Base.ATTR_ADDRESS]: address } as any;
}

/** Extract address for update payloads (needs 'base:address'). */
function toUpdate(obj: CorneaObj) {
  return { ...obj, [Base.ATTR_ADDRESS]: obj[Base.ATTR_ADDRESS] as string } as any;
}

function addr(obj: CorneaObj): string {
  return obj[Base.ATTR_ADDRESS] as string;
}

const ENTITY_NAMESPACE_MAP: Record<string, EntityActions> = {
  dev: {
    added: (obj) => deviceAdded(toEntity(obj)),
    updated: (obj) => deviceUpdated(toUpdate(obj)),
    removed: (obj) => deviceRemoved(addr(obj)),
  },
  sub: {
    added: (obj) => subsystemAdded(toEntity(obj)),
    updated: (obj) => subsystemUpdated(toUpdate(obj)),
    removed: (obj) => subsystemRemoved(addr(obj)),
  },
  rule: {
    added: (obj) => ruleAdded(toEntity(obj)),
    updated: (obj) => ruleUpdated(toUpdate(obj)),
    removed: (obj) => ruleRemoved(addr(obj)),
  },
  scene: {
    added: (obj) => sceneAdded(toEntity(obj)),
    updated: (obj) => sceneUpdated(toUpdate(obj)),
    removed: (obj) => sceneRemoved(addr(obj)),
  },
  scheduler: {
    added: (obj) => schedulerAdded(toEntity(obj)),
    updated: (obj) => schedulerUpdated(toUpdate(obj)),
    removed: (obj) => schedulerRemoved(addr(obj)),
  },
  incident: {
    added: (obj) => incidentAdded(toEntity(obj)),
    updated: (obj) => incidentUpdated(toUpdate(obj)),
    removed: (obj) => incidentRemoved(addr(obj)),
  },
  person: {
    added: (obj) => personAdded(toEntity(obj)),
    updated: (obj) => personUpdated(toUpdate(obj)),
    removed: (obj) => personRemoved(addr(obj)),
  },
};

/**
 * Hub uses a different pattern — it's a single entity, not a collection.
 * The ModelConnection for hub uses 'base:id' as idProp (not 'base:address').
 */
const HUB_NAMESPACE = 'hub';

/**
 * Place updates are dispatched to the placeSlice (single entity).
 */
const PLACE_NAMESPACE = 'place';

// Track cleanup functions so we can unsubscribe on logout
let cleanupListeners: (() => void)[] = [];

function applyPropertyAlias(eventName: string, obj: Record<string, any>): void {
  const alias = propertyAliases.alias[eventName];
  if (alias) alias(obj);
}

function subscribeToCorneaEvents(dispatch: (action: any) => void, getState: () => RootState): void {
  // Clean up any previous subscriptions
  unsubscribeFromCorneaEvents();

  // Subscribe to entity namespaces (ModelConnection pattern)
  for (const [namespace, actions] of Object.entries(ENTITY_NAMESPACE_MAP)) {
    const onValueChange = (obj: Record<string, any>) => {
      applyPropertyAlias(`${namespace} ${Base.EVENT_VALUECHANGE}`, obj);
      dispatch(actions.updated(obj));
    };

    const onAdded = (obj: Record<string, any>) => {
      applyPropertyAlias(`${namespace} ${Base.EVENT_ADDED}`, obj);
      dispatch(actions.added(obj));
    };

    const onDeleted = (obj: Record<string, any>) => {
      dispatch(actions.removed(obj));
    };

    cornea.on(`${namespace} ${Base.EVENT_VALUECHANGE}`, onValueChange);
    cornea.on(`${namespace} ${Base.EVENT_ADDED}`, onAdded);
    cornea.on(`${namespace} ${Base.EVENT_DELETED}`, onDeleted);

    cleanupListeners.push(
      () => cornea.off(`${namespace} ${Base.EVENT_VALUECHANGE}`, onValueChange),
      () => cornea.off(`${namespace} ${Base.EVENT_ADDED}`, onAdded),
      () => cornea.off(`${namespace} ${Base.EVENT_DELETED}`, onDeleted),
    );
  }

  // Hub events — single entity, not a collection
  const onHubValueChange = (obj: Record<string, any>) => {
    dispatch(updateHub(obj));
  };
  const onHubAdded = (obj: Record<string, any>) => {
    dispatch(setHub(obj));
  };
  const onHubDeleted = () => {
    dispatch(clearHub());
  };

  cornea.on(`${HUB_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onHubValueChange);
  cornea.on(`${HUB_NAMESPACE} ${Base.EVENT_ADDED}`, onHubAdded);
  cornea.on(`${HUB_NAMESPACE} ${Base.EVENT_DELETED}`, onHubDeleted);

  cleanupListeners.push(
    () => cornea.off(`${HUB_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onHubValueChange),
    () => cornea.off(`${HUB_NAMESPACE} ${Base.EVENT_ADDED}`, onHubAdded),
    () => cornea.off(`${HUB_NAMESPACE} ${Base.EVENT_DELETED}`, onHubDeleted),
  );

  // Place events — single entity
  const onPlaceValueChange = (obj: Record<string, any>) => {
    dispatch(setPlace(obj));
  };

  cornea.on(`${PLACE_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onPlaceValueChange);

  cleanupListeners.push(
    () => cornea.off(`${PLACE_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onPlaceValueChange),
  );

  // Invitation events — person:InvitationPending is broadcast from the
  // place address, so the Cornea event namespace is 'place'.
  // Mirrors context-bar.js: Cornea.on('place person:InvitationPending', ...)
  const refreshInvitations = () => {
    const personId = getState().auth.person?.['personId'];
    if (typeof personId !== 'string') return;
    Bridge.request<PendingInvitationsResponse>(Person.CMD_PENDINGINVITATIONS, `SERV:person:${personId}`, {})
      .then((result) => {
        dispatch(setInvitations(result.invitations ?? []));
      })
      .catch(() => {});
  };

  const onInvitationPending = () => refreshInvitations();
  const onInvitationCancelled = () => refreshInvitations();

  cornea.on(`place ${Person.EVENT_INVITATIONPENDING}`, onInvitationPending);
  cornea.on(`place ${Person.EVENT_INVITATIONCANCELLED}`, onInvitationCancelled);

  cleanupListeners.push(
    () => cornea.off(`place ${Person.EVENT_INVITATIONPENDING}`, onInvitationPending),
    () => cornea.off(`place ${Person.EVENT_INVITATIONCANCELLED}`, onInvitationCancelled),
  );

  // Session unauthorized — triggers logout
  const onUnauthorized = () => {
    dispatch(logout());
  };

  cornea.on('sess unauthorized', onUnauthorized);
  cleanupListeners.push(
    () => cornea.off('sess unauthorized', onUnauthorized),
  );
}

function unsubscribeFromCorneaEvents(): void {
  for (const cleanup of cleanupListeners) {
    cleanup();
  }
  cleanupListeners = [];
}

/**
 * Redux middleware that subscribes to Cornea WebSocket events on login
 * and unsubscribes on logout. All real-time entity updates flow through
 * this middleware into the Redux store.
 */
export const corneaMiddleware: Middleware = (storeApi) => (next) => (action) => {
  const result = next(action);

  // After loginSuccess is dispatched, subscribe to Cornea events
  if (loginSuccess.match(action)) {
    subscribeToCorneaEvents(storeApi.dispatch, storeApi.getState);
  }

  // After logout is dispatched, unsubscribe from Cornea events
  if (logout.match(action)) {
    unsubscribeFromCorneaEvents();
  }

  return result;
};

export default corneaMiddleware;
