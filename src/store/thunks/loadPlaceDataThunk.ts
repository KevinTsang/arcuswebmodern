/**
 * Async thunk that loads all data for a place.
 *
 * Replicates the placeId setter from src/app.js (lines 514-644).
 * Clears all entity state, then loads in parallel:
 *   products (+ hub gen2/gen3), subsystems, schedulers, scenes,
 *   rules, rule templates, place → devices, persons, hub
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import Bridge from '@arcus/core/bridge';
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
import { incidentsClear } from '../slices/incidentsSlice';
import { peopleReceived, peopleClear } from '../slices/peopleSlice';
import { setHub, clearHub } from '../slices/hubSlice';

export const loadPlaceDataThunk = createAsyncThunk(
  'place/loadData',
  async (placeId: string, { dispatch }) => {
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
      Bridge.request('base:GetAttributes', placeAddress, {}).catch((e) => {
        console.error('Failed to load place:', e);
        return null;
      }),
    ]);

    // Dispatch products (including hub gen2/gen3 products)
    const products = (productsResult as any).products ?? [];
    // Also fetch hub generation 2 and 3 product definitions
    const hubProductPromises = ['dee000', 'dee001'].map((productId) =>
      ProductCatalogService.GetProduct(placeAddress, productId)
        .then((res: any) => res.product)
        .catch(() => null),
    );
    const hubProducts = await Promise.all(hubProductPromises);
    const allProducts = [
      ...products,
      ...hubProducts.filter(Boolean),
    ];
    dispatch(setProducts(allProducts));

    // Dispatch subsystems
    const subsystems = (subsystemsResult as any).subsystems ?? [];
    dispatch(subsystemsReceived(subsystems));

    // Dispatch schedulers
    const schedulers = (schedulersResult as any).schedulers ?? [];
    dispatch(schedulersReceived(schedulers));

    // Dispatch scenes
    const scenes = (scenesResult as any).scenes ?? [];
    dispatch(scenesReceived(scenes));

    // Dispatch rules
    const rules = (rulesResult as any).rules ?? [];
    dispatch(rulesReceived(rules));

    // Dispatch rule templates
    const ruleTemplates = (ruleTemplatesResult as any).ruleTemplates ?? [];
    dispatch(setRuleTemplates(ruleTemplates));

    // Dispatch place and load dependent data (devices, persons, hub)
    if (placeResult) {
      dispatch(setPlace(placeResult));

      // Load devices, persons, hub from place in parallel
      // These are place capability methods (not service methods)
      const [devicesResult, personsResult, hubResult] = await Promise.all([
        Bridge.request('place:ListDevices', placeAddress, {}).catch((e) => {
          console.error('Failed to load devices:', e);
          return { devices: [] };
        }),
        Bridge.request('place:ListPersons', placeAddress, {}).catch((e) => {
          console.error('Failed to load persons:', e);
          return { persons: [] };
        }),
        Bridge.request('place:GetHub', placeAddress, {}).catch((e) => {
          console.error('Failed to load hub:', e);
          return { hub: {} };
        }),
      ]);

      // Dispatch devices
      const devices = (devicesResult as any).devices ?? [];
      dispatch(devicesReceived(devices));

      // Dispatch persons
      const persons = (personsResult as any).persons ?? [];
      dispatch(peopleReceived(persons));

      // Handle hub — mirrors the halfFull pattern from app.js
      const hub = (hubResult as any).hub ?? {};
      if (hub['base:id']) {
        dispatch(setHub(hub));

        // Fetch full hub attributes asynchronously (non-blocking)
        Bridge.request('base:GetAttributes', `SERV:${hub['base:id']}:hub`, {})
          .then((fullHub) => {
            dispatch(setHub({ ...hub, ...fullHub }));
          })
          .catch((e) => {
            console.error('Failed to load full hub attributes:', e);
          });
      }
    }

    // Mark place as ready
    dispatch(setReady(true));

    return placeId;
  },
);
