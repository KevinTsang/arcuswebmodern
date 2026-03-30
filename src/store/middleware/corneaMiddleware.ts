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
import { Base, Person, AlarmIncident } from '@arcus/core';
import type { ArcusPayload, PlaceData } from '../entityTypes';
import { loginSuccess, logout, sessionExpired } from '../slices/authSlice';
import { deviceAdded, deviceUpdated, deviceRemoved } from '../slices/devicesSlice';
import { subsystemAdded, subsystemUpdated, subsystemRemoved } from '../slices/subsystemsSlice';
import { ruleAdded, ruleUpdated, ruleRemoved } from '../slices/rulesSlice';
import { sceneAdded, sceneUpdated, sceneRemoved } from '../slices/scenesSlice';
import { schedulerAdded, schedulerUpdated, schedulerRemoved } from '../slices/schedulersSlice';
import { incidentAdded, incidentUpdated, incidentRemoved, setCurrentIncident } from '../slices/incidentsSlice';
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
interface EntityActions {
  added: (entity: ArcusPayload) => { type: string };
  updated: (entity: ArcusPayload) => { type: string };
  removed: (entity: ArcusPayload) => { type: string };
}

/** Extract address and build entity with `id` for EntityAdapter. */
function toEntity(obj: ArcusPayload) {
  const address = obj[Base.ATTR_ADDRESS];
  return { ...obj, id: address, [Base.ATTR_ADDRESS]: address };
}

/** Extract address for update payloads (needs 'base:address'). */
function toUpdate(obj: ArcusPayload): ArcusPayload {
  return { ...obj, [Base.ATTR_ADDRESS]: obj[Base.ATTR_ADDRESS] };
}

function addr(obj: ArcusPayload): string {
  return obj[Base.ATTR_ADDRESS];
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

function applyPropertyAlias(eventName: string, obj: ArcusPayload): void {
  const alias = propertyAliases.alias[eventName];
  if (alias) alias(obj);
}

function subscribeToCorneaEvents(dispatch: (action: { type: string }) => void, getState: () => RootState): void {
  // Clean up any previous subscriptions
  unsubscribeFromCorneaEvents();

  // Subscribe to entity namespaces (ModelConnection pattern)
  for (const [namespace, actions] of Object.entries(ENTITY_NAMESPACE_MAP)) {
    const onValueChange = (obj: ArcusPayload) => {
      applyPropertyAlias(`${namespace} ${Base.EVENT_VALUECHANGE}`, obj);
      dispatch(actions.updated(obj));
    };

    const onAdded = (obj: ArcusPayload) => {
      applyPropertyAlias(`${namespace} ${Base.EVENT_ADDED}`, obj);
      dispatch(actions.added(obj));
    };

    const onDeleted = (obj: ArcusPayload) => {
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
  const onHubValueChange = (obj: ArcusPayload) => {
    dispatch(updateHub(obj));
  };
  const onHubAdded = (obj: ArcusPayload) => {
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

  // Place events — single entity (platform always includes base:id for place)
  const onPlaceValueChange = (obj: ArcusPayload) => {
    dispatch(setPlace(obj as PlaceData));
  };

  cornea.on(`${PLACE_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onPlaceValueChange);

  cleanupListeners.push(
    () => cornea.off(`${PLACE_NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onPlaceValueChange),
  );

  // Incident alert events — fired when a new alarm is triggered.
  // Mirrors incident.js lines 131-135: sets current incident on alert.
  const ALERT_EVENTS = [
    AlarmIncident.EVENT_SECURITYALERT,
    AlarmIncident.EVENT_WATERALERT,
    AlarmIncident.EVENT_COALERT,
    AlarmIncident.EVENT_SMOKEALERT,
    AlarmIncident.EVENT_PANICALERT,
  ];

  for (const event of ALERT_EVENTS) {
    const onAlert = (obj: ArcusPayload) => {
      const address = obj[Base.ATTR_ADDRESS];
      if (address) {
        dispatch(setCurrentIncident(address));
      }
    };
    cornea.on(`incident ${event}`, onAlert);
    cleanupListeners.push(
      () => cornea.off(`incident ${event}`, onAlert),
    );
  }

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

  // Session unauthorized — marks session as expired and clears auth state
  const onUnauthorized = () => {
    dispatch(sessionExpired());
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

  // After logout or session expiry, unsubscribe from Cornea events
  if (logout.match(action) || sessionExpired.match(action)) {
    unsubscribeFromCorneaEvents();
  }

  return result;
};

export default corneaMiddleware;
