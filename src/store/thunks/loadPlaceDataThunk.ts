/**
 * Async thunk that loads all data for a place.
 *
 * Replicates the placeId setter from src/app.js (lines 514-644).
 * Clears all entity state, then loads in parallel:
 *   products (+ hub gen2/gen3), subsystems, schedulers, scenes,
 *   rules, rule templates, place → devices, persons, hub
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import Bridge from '@arcus/core/bridge';
import { Base, Place, Person, AlarmSubsystem, AlarmIncident } from '@arcus/core';
import {
  ProductCatalogService,
  SubsystemService,
  SchedulerService,
  SceneService,
  RuleService,
} from '@arcus/core/services';
import { setPlaceId, setPlace, setProducts, setReady } from '../slices/placeSlice';
import { devicesReceived, devicesClear } from '../slices/devicesSlice';
import { subsystemsReceived, subsystemsClear } from '../slices/subsystemsSlice';
import { rulesReceived, rulesClear, setRuleTemplates } from '../slices/rulesSlice';
import { scenesReceived, scenesClear } from '../slices/scenesSlice';
import { schedulersReceived, schedulersClear } from '../slices/schedulersSlice';
import { incidentsClear, incidentsReceived, setCurrentIncident } from '../slices/incidentsSlice';
import { peopleReceived, peopleClear } from '../slices/peopleSlice';
import { setHub, clearHub } from '../slices/hubSlice';
import { setInvitations, clearInvitations } from '../slices/invitationsSlice';
import type {
  ListDevicesResponse, ListPersonsResponse, GetHubResponse, PendingInvitationsResponse,
  ListIncidentsResponse, GetProductsResponse,
  ListSubsystemsResponse, ListSchedulersResponse, ListScenesResponse,
  ListRulesResponse, ListRuleTemplatesResponse,
} from '@/arcus/types';
import type { PlaceData, PairingProduct, SubsystemData, IncidentData } from '../entityTypes';

export const loadPlaceDataThunk = createAsyncThunk<string, string, { state: RootState }>(
  'place/loadData',
  async (placeId, { dispatch, getState }) => {
    // Clear all entity state (mirrors app.js removeAttr calls)
    dispatch(setPlaceId(placeId)); // also sets ready=false
    dispatch(devicesClear());
    dispatch(subsystemsClear());
    dispatch(rulesClear());
    dispatch(scenesClear());
    dispatch(schedulersClear());
    dispatch(incidentsClear());
    dispatch(peopleClear());
    dispatch(clearHub());
    dispatch(clearInvitations());

    const placeAddress = `SERV:place:${placeId}`;

    // Fire all top-level fetches in parallel (matching app.js pattern)
    const [
      productsResult,
      subsystemsResult,
      schedulersResult,
      scenesResult,
      rulesResult,
      ruleTemplatesResult,
      placeResult,
    ] = await Promise.all([
      // Products
      ProductCatalogService.GetProducts(placeAddress).catch((e) => {
        console.error('Failed to load products:', e);
        return { products: [] };
      }),

      // Subsystems
      SubsystemService.ListSubsystems(placeId).catch((e) => {
        console.error('Failed to load subsystems:', e);
        return { subsystems: [] };
      }),

      // Schedulers
      SchedulerService.ListSchedulers(placeId, false).catch((e) => {
        console.error('Failed to load schedulers:', e);
        return { schedulers: [] };
      }),

      // Scenes
      SceneService.ListScenes(placeId).catch((e) => {
        console.error('Failed to load scenes:', e);
        return { scenes: [] };
      }),

      // Rules
      RuleService.ListRules(placeId).catch((e) => {
        console.error('Failed to load rules:', e);
        return { rules: [] };
      }),

      // Rule templates
      RuleService.ListRuleTemplates(placeId).catch((e) => {
        console.error('Failed to load rule templates:', e);
        return { ruleTemplates: [] };
      }),

      // Place (then load devices, persons, hub from place)
      Bridge.request<PlaceData>(Base.CMD_GETATTRIBUTES, placeAddress, {}).catch((e) => {
        console.error('Failed to load place:', e);
        return null;
      }),
    ]);

    // Dispatch products (including hub gen2/gen3 products)
    const products = (productsResult as GetProductsResponse).products ?? [];
    // Also fetch hub generation 2 and 3 product definitions
    const hubProductPromises = ['dee000', 'dee001'].map((productId) =>
      ProductCatalogService.GetProduct(placeAddress, productId)
        .then((res): PairingProduct | null => (res['product'] as PairingProduct) ?? null)
        .catch((): null => null),
    );
    const hubProducts = await Promise.all(hubProductPromises);
    const allProducts: PairingProduct[] = [
      ...products,
      ...hubProducts.filter((p): p is PairingProduct => p !== null),
    ];
    dispatch(setProducts(allProducts));

    // Dispatch subsystems
    const subsystems = (subsystemsResult as ListSubsystemsResponse).subsystems ?? [];
    dispatch(subsystemsReceived(subsystems));

    // Load existing incidents from the alarm subsystem (mirrors app.js lines 842-846)
    const alarmSub = subsystems.find((s: SubsystemData) => {
      const addr = s[Base.ATTR_ADDRESS];
      return addr?.startsWith('SERV:subalarm:');
    });
    if (alarmSub) {
      const alarmAddr = alarmSub[Base.ATTR_ADDRESS];
      Bridge.request<ListIncidentsResponse>(AlarmSubsystem.CMD_LISTINCIDENTS, alarmAddr, {})
        .then((result) => {
          const incidents = result.incidents ?? [];
          if (incidents.length > 0) {
            dispatch(incidentsReceived(incidents));
            // Set current incident if one is in ALERT state
            const active = incidents.find(
              (i: IncidentData) => i[AlarmIncident.ATTR_ALERTSTATE] === AlarmIncident.ALERTSTATE_ALERT,
            );
            if (active) {
              dispatch(setCurrentIncident(active[Base.ATTR_ADDRESS]));
            }
          }
        })
        .catch((e) => {
          console.error('Failed to load incidents:', e);
        });
    }

    // Dispatch schedulers
    const schedulers = (schedulersResult as ListSchedulersResponse).schedulers ?? [];
    dispatch(schedulersReceived(schedulers));

    // Dispatch scenes
    const scenes = (scenesResult as ListScenesResponse).scenes ?? [];
    dispatch(scenesReceived(scenes));

    // Dispatch rules
    const rules = (rulesResult as ListRulesResponse).rules ?? [];
    dispatch(rulesReceived(rules));

    // Dispatch rule templates
    const ruleTemplates = (ruleTemplatesResult as ListRuleTemplatesResponse).ruleTemplates ?? [];
    dispatch(setRuleTemplates(ruleTemplates));

    // Dispatch place and load dependent data (devices, persons, hub)
    if (placeResult) {
      dispatch(setPlace(placeResult));

      // Load devices, persons, hub from place in parallel
      // These are place capability methods (not service methods)
      const [devicesResult, personsResult, hubResult] = await Promise.all([
        Bridge.request<ListDevicesResponse>(Place.CMD_LISTDEVICES, placeAddress, {}).catch((e) => {
          console.error('Failed to load devices:', e);
          return { devices: [] } as ListDevicesResponse;
        }),
        Bridge.request<ListPersonsResponse>(Place.CMD_LISTPERSONS, placeAddress, {}).catch((e) => {
          console.error('Failed to load persons:', e);
          return { persons: [] } as ListPersonsResponse;
        }),
        Bridge.request<GetHubResponse>(Place.CMD_GETHUB, placeAddress, {}).catch((e) => {
          console.error('Failed to load hub:', e);
          return { hub: {} } as GetHubResponse;
        }),
      ]);

      // Dispatch devices
      const devices = devicesResult.devices ?? [];
      dispatch(devicesReceived(devices));

      // Dispatch persons
      const persons = personsResult.persons ?? [];
      dispatch(peopleReceived(persons));

      // Handle hub — mirrors the halfFull pattern from app.js
      const hub = hubResult.hub ?? {};
      if (hub[Base.ATTR_ID]) {
        dispatch(setHub(hub));

        // Fetch full hub attributes asynchronously (non-blocking)
        Bridge.request(Base.CMD_GETATTRIBUTES, `SERV:${hub[Base.ATTR_ID]}:hub`, {})
          .then((fullHub) => {
            dispatch(setHub({ ...hub, ...fullHub }));
          })
          .catch((e) => {
            console.error('Failed to load full hub attributes:', e);
          });
      }
    }

    // Fetch pending invitations for the current person (non-blocking)
    const personId = getState().auth.person?.['personId'];
    if (typeof personId === 'string') {
      Bridge.request<PendingInvitationsResponse>(Person.CMD_PENDINGINVITATIONS, `SERV:person:${personId}`, {})
        .then((result) => {
          dispatch(setInvitations(result.invitations ?? []));
        })
        .catch((e) => {
          console.error('Failed to load pending invitations:', e);
        });
    }

    // Mark place as ready
    dispatch(setReady(true));

    return placeId;
  },
);
