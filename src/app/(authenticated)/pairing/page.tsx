'use client';

/**
 * Pairing page — ported from src/pages/pairing/.
 *
 * Multi-stage device pairing wizard:
 *   1. Steps — device-specific pairing instructions
 *   2. Search — hub searches for devices, shows progress
 *   3. Customize — name device, set favorite, etc.
 *   4. Complete — success or mispaired status
 *
 * The product to pair is read from sessionStorage (set by product-catalog).
 * Hub pairing (RegisterHubV2) is handled separately from device pairing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Base, Device, Product, PairingDevice, PairingSubsystem, Hub, Place } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import type { ListPairingDevicesResponse, StartPairingResponse, RegisterHubV2Response } from '@/arcus/types';
import { HUB_REGISTRATION_ERRORS } from '@/arcus/types';
import type { PairingDevice as PairingDeviceData } from '@/store/entityTypes';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { setHub } from '@/store/slices/hubSlice';
import {
  loadProduct,
  startSearch as startSearchAction,
  setDevices,
  devicePaired,
  deviceMispaired,
  searchTimedOut,
  searchFailed,
  setPairingLoading,
  setSteps,
  startHubRegistration as startHubRegistrationAction,
  hubRegistered,
  setHubRegistrationState,
  hubRegistrationError,
  customizationComplete,
  startPairingFlow,
  endPairingFlow,
  resetPairing,
} from '@/store/slices/pairingSlice';
import {
  StageIndicator,
  StepsStage,
  SearchingStage,
  CustomizeStage,
  CompletedStage,
} from '@/components/pairing';
import type { PairingFlow } from '@/components/pairing';
import {
  earlierMispairedDevices,
  findMispairedDevice,
  findPairedDevice,
  isPaired,
  newPairingFlow,
  searchDevices,
} from '@/lib/pairingFlow';

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);
  const pairing = useAppSelector((s) => s.pairing);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The pairing subsystem this page is working with, or null once the page has
  // unmounted. Async pairing work checks it after every await, so nothing is
  // sent and no timer starts after the cleanup below has stopped searching.
  const liveSubsystemRef = useRef<string | null>(null);
  // The current pairing flow, readable by async work before the store update
  // that starts a flow has re-rendered the page.
  const flowRef = useRef<PairingFlow | null>(pairing.flow);
  // Pairing devices this page has dismissed or is dismissing, so they aren't dismissed twice.
  const dismissedRef = useRef<Set<string>>(new Set());
  // Save & Finish, Go to Devices and Pair Another run one at a time.
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);

  // Reset pairing state on mount/unmount
  useEffect(() => {
    dispatch(resetPairing());
    return () => {
      dispatch(resetPairing());
    };
  }, [dispatch]);

  useEffect(() => {
    flowRef.current = pairing.flow;
  }, [pairing.flow]);

  // Product loading is handled in the auto-start effect below to avoid race conditions.

  // Find pairing subsystem address
  const pairingSubAddr = (() => {
    if (!subsystems?.entities) return null;
    const entries = Object.values(subsystems.entities) as Array<Record<string, unknown>>;
    const sub = entries.find((s) => {
      const addr = s[Base.ATTR_ADDRESS] as string;
      return addr?.includes('subpairing');
    });
    return (sub?.[Base.ATTR_ADDRESS] as string) ?? null;
  })();

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    pollRef.current = null;
    searchTimeoutRef.current = null;
  }, []);

  // Stop pairing on unmount or page refresh/close
  useEffect(() => {
    liveSubsystemRef.current = pairingSubAddr;
    const stopPairing = () => {
      stopPolling();
      if (pairingSubAddr) {
        Bridge.request(PairingSubsystem.CMD_STOPSEARCHING, pairingSubAddr, {}).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', stopPairing);
    return () => {
      liveSubsystemRef.current = null;
      window.removeEventListener('beforeunload', stopPairing);
      stopPairing();
    };
  }, [pairingSubAddr, stopPolling]);

  // ── Pairing flow ───────────────────────────────────────────

  // Return this place's pairing flow, starting one from the current pairing
  // list if there is none. Called before StartPairing (or Search, when there are
  // no steps), so the list is read before this flow puts the hub in pairing mode.
  const ensureFlow = useCallback(async (subAddr: string): Promise<PairingFlow> => {
    const current = flowRef.current;
    if (current?.pairingSubsystem === subAddr) return current;
    const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, subAddr, {});
    const flow = newPairingFlow(subAddr, resp.devices ?? []);
    flowRef.current = flow;
    dispatch(startPairingFlow(flow));
    return flow;
  }, [dispatch]);

  // Remove a PAIRED device from the pairing list once the user is done with it.
  // Callers don't await it: it is best-effort and can take up to the request timeout.
  const dismissPairingDevice = useCallback(async (device: PairingDeviceData) => {
    const address = device[Base.ATTR_ADDRESS];
    // The platform only dismisses PAIRED devices.
    if (!isPaired(device) || dismissedRef.current.has(address)) return;
    // Mark it before sending, so a second call while this one is in flight sends nothing.
    dismissedRef.current.add(address);
    try {
      await Bridge.request(PairingDevice.CMD_DISMISS, address, {});
    } catch (e) {
      // No error toast: the device itself is paired, and a failed customization
      // has already been reported. Dismiss only tidies the pairing list; the flow
      // skips this device from now on, and DismissAll on Finish removes it.
      dismissedRef.current.delete(address); // so Pair Another can try again
      console.warn('Failed to dismiss pairing device:', e);
    }
  }, []);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    const subAddr = pairingSubAddr;
    if (!subAddr) return;

    stopPolling();
    dispatch(startSearchAction());

    try {
      const flow = await ensureFlow(subAddr);
      if (liveSubsystemRef.current !== subAddr) return;
      await Bridge.request(PairingSubsystem.CMD_SEARCH, subAddr, {
        productAddress: pairing.product?.[Base.ATTR_ADDRESS] ?? '',
      });
      if (liveSubsystemRef.current !== subAddr) return;

      let found = false;
      const checkDevices = async () => {
        try {
          const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, subAddr, {});
          // Drop a poll that finishes after the page left or after an earlier poll found the device.
          if (found || liveSubsystemRef.current !== subAddr) return;
          const devList = resp.devices ?? [];
          dispatch(setDevices(devList));

          const paired = findPairedDevice(devList, flow);
          if (paired) {
            found = true;
            stopPolling();
            dispatch(devicePaired({
              device: paired,
              defaultName: paired[PairingDevice.ATTR_DEVICEADDRESS]
                ? ''
                : (pairing.product?.[Product.ATTR_NAME] ?? 'New Device'),
            }));
            return;
          }

          const mispaired = findMispairedDevice(devList, flow);
          if (mispaired) {
            found = true;
            stopPolling();
            dispatch(deviceMispaired(mispaired));
          }
        } catch (e) {
          console.warn('Pairing device poll failed:', e);
        }
      };

      pollRef.current = setInterval(checkDevices, 3000);

      searchTimeoutRef.current = setTimeout(() => {
        stopPolling();
        dispatch(searchTimedOut());
      }, 180000);
    } catch {
      if (liveSubsystemRef.current !== subAddr) return;
      dispatch(searchFailed());
      dispatch(addNotification({ type: 'error', message: 'Failed to search for devices.' }));
    }
  }, [pairing.product, pairingSubAddr, dispatch, ensureFlow, stopPolling]);

  // ── Start Pairing (put hub in search mode) ─────────────────

  const startPairing = useCallback(async () => {
    const subAddr = pairingSubAddr;
    if (!pairing.product || !subAddr) return;
    const productAddress = pairing.product[Base.ATTR_ADDRESS];

    dispatch(setPairingLoading(true));
    try {
      await ensureFlow(subAddr);
      if (liveSubsystemRef.current !== subAddr) return;
      const resp = await Bridge.request<StartPairingResponse>(PairingSubsystem.CMD_STARTPAIRING, subAddr, {
        productAddress,
      });
      if (liveSubsystemRef.current !== subAddr) return;

      const pairingSteps = resp.steps ?? [];
      dispatch(setSteps(pairingSteps));

      if (pairingSteps.length === 0) {
        startSearch();
      }
    } catch {
      if (liveSubsystemRef.current === subAddr) {
        dispatch(addNotification({ type: 'error', message: 'Failed to start pairing. Check hub connection.' }));
      }
    } finally {
      if (liveSubsystemRef.current === subAddr) dispatch(setPairingLoading(false));
    }
  }, [pairing.product, pairingSubAddr, dispatch, ensureFlow, startSearch]);

  // Load product from sessionStorage and auto-start pairing in a single effect
  // to avoid race conditions between separate load and start effects.
  const hasInitiated = useRef(false);
  useEffect(() => {
    // Load product from sessionStorage if not yet in state
    const stored = sessionStorage.getItem('pairing:product');
    if (stored && !pairing.product) {
      const parsed = JSON.parse(stored);
      const productId = parsed[Product.ATTR_ID];
      dispatch(loadProduct({
        product: parsed,
        isHubPairing: productId === 'dee000' || productId === 'dee001',
      }));
      return; // Wait for re-render with product populated in state
    }

    if (hasInitiated.current) return;
    if (!pairingSubAddr) return;
    if (pairing.isHubPairing) return;

    if (pairing.product) {
      hasInitiated.current = true;
      startPairing();
    } else if (pairing.stage === 'steps') {
      hasInitiated.current = true;
      startSearch();
    }
  }, [pairing.product, pairing.isHubPairing, pairing.stage, pairingSubAddr, startPairing, startSearch, dispatch]);

  // ── Hub Registration ───────────────────────────────────────

  const handleStartHubRegistration = useCallback(async () => {
    if (!pairing.hubId.trim() || !placeId) return;

    dispatch(startHubRegistrationAction());

    const pollHub = async () => {
      try {
        const placeAddr = `SERV:place:${placeId}`;
        const resp = await Bridge.request<RegisterHubV2Response>(Place.CMD_REGISTERHUBV2, placeAddr, {
          hubId: pairing.hubId.trim().toUpperCase(),
        });

        dispatch(setHubRegistrationState(resp.state));

        if (resp.state === Hub.REGISTRATIONSTATE_REGISTERED) {
          if (pollRef.current) clearInterval(pollRef.current);
          const hubData = resp.hub;
          if (hubData) {
            dispatch(setHub(hubData));
          }
          dispatch(hubRegistered());
        } else if (
          resp.state === HUB_REGISTRATION_ERRORS.ALREADY_REGISTERED ||
          resp.state === HUB_REGISTRATION_ERRORS.ORPHANED_HUB ||
          resp.state === HUB_REGISTRATION_ERRORS.INVALID_PARAM
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          dispatch(hubRegistrationError(resp.state));
        }
      } catch (e) {
        console.warn('Hub registration poll failed:', e);
      }
    };

    pollRef.current = setInterval(pollHub, 5000);
    pollHub();
  }, [pairing.hubId, placeId, dispatch]);

  // ── Customization ──────────────────────────────────────────

  const handleCustomize = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (pairing.isHubPairing) {
        if (hub && pairing.deviceName.trim()) {
          try {
            const hubAddr = hub[Base.ATTR_ADDRESS] as string;
            await Bridge.request(Base.CMD_SETATTRIBUTES, hubAddr, {
              [Device.ATTR_NAME]: pairing.deviceName.trim(),
            });
          } catch {
            dispatch(addNotification({ type: 'error', message: 'Failed to set hub name.' }));
          }
        }
      } else if (pairing.activeDevice) {
        const device = pairing.activeDevice;
        try {
          await Bridge.request(PairingDevice.CMD_CUSTOMIZE, device[Base.ATTR_ADDRESS], {});

          if (pairing.deviceName.trim()) {
            const devAddr = device[PairingDevice.ATTR_DEVICEADDRESS];
            if (devAddr) {
              await Bridge.request(Base.CMD_SETATTRIBUTES, devAddr, {
                [Device.ATTR_NAME]: pairing.deviceName.trim(),
              });
            }
          }

          await Bridge.request(PairingDevice.CMD_ADDCUSTOMIZATION, device[Base.ATTR_ADDRESS], {
            customization: 'NAME',
          });

          if (pairing.isFavorite) {
            await Bridge.request(PairingDevice.CMD_ADDCUSTOMIZATION, device[Base.ATTR_ADDRESS], {
              customization: 'FAVORITE',
            });
          }

          // Not awaited: the customization is saved, so a slow Dismiss mustn't hold back the Completed screen.
          dismissPairingDevice(device);
        } catch {
          dispatch(addNotification({ type: 'error', message: 'Failed to save device customization. You can rename the device later from the Devices page.' }));
        }
      }
      dispatch(customizationComplete());
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [pairing.isHubPairing, pairing.activeDevice, pairing.deviceName, pairing.isFavorite, hub, dispatch, dismissPairingDevice]);

  // ── Finish ─────────────────────────────────────────────────

  // Finish and Pair Another leave the page, so they stay busy until it unmounts.
  const handleFinish = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    if (pairingSubAddr) {
      try {
        await Bridge.request(PairingSubsystem.CMD_DISMISSALL, pairingSubAddr, {});
      } catch {
        // OK
      }
    }
    // The pairing flow ends here; the next pairing starts a new one.
    flowRef.current = null;
    dispatch(endPairingFlow());
    sessionStorage.removeItem('pairing:product');
    router.push('/devices');
  }, [pairingSubAddr, router, dispatch]);

  // Pair Another stays in the pairing flow, so it skips DismissAll, which ends
  // pairing and takes the hub out of pairing mode. It dismisses just the device
  // we finished with; the rest of the flow skips that device either way.
  const handlePairAnother = useCallback(() => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    if (pairing.activeDevice) {
      // Not awaited, so a slow Dismiss doesn't hold up navigation.
      dismissPairingDevice(pairing.activeDevice);
    }
    sessionStorage.removeItem('pairing:product');
    router.push('/product-catalog');
  }, [pairing.activeDevice, dismissPairingDevice, router]);

  const productName = pairing.product
    ? `${pairing.product[Product.ATTR_VENDOR] ?? ''} ${pairing.product[Product.ATTR_NAME] ?? ''}`.trim()
    : '';

  // Show only what the current search found, plus earlier improperly paired
  // devices (labeled as such), never leftovers the search ignores.
  const flow = pairing.flow?.pairingSubsystem === pairingSubAddr ? pairing.flow : null;
  const foundDevices = flow ? searchDevices(pairing.devices, flow) : [];
  const earlierDevices = flow ? earlierMispairedDevices(pairing.devices, flow) : [];

  return (
    <div className="p-[var(--gutter)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/product-catalog')}
          className="text-sm text-peacock hover:underline"
        >
          &larr; Product Catalog
        </button>
        <h2 data-testid="pairing-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          {productName ? `Pair ${productName}` : 'Pair a Device'}
        </h2>
      </div>

      <div className="max-w-lg mx-auto">
        <StageIndicator stage={pairing.stage} />

        <div className="bg-crane border border-heron rounded-[var(--border-radius-lg)] p-6">
          {pairing.stage === 'steps' && (
            <StepsStage
              product={pairing.product}
              isHubPairing={pairing.isHubPairing}
              steps={pairing.steps}
              currentStep={pairing.currentStep}
              loading={pairing.loading}
              hubId={pairing.hubId}
              dispatch={dispatch}
              onStartSearch={startSearch}
              onStartHubRegistration={handleStartHubRegistration}
              onCancel={() => router.push('/product-catalog')}
            />
          )}

          {pairing.stage === 'searching' && (
            <SearchingStage
              product={pairing.product}
              isHubPairing={pairing.isHubPairing}
              devices={foundDevices}
              earlierDevices={earlierDevices}
              searchTimedOut={pairing.searchTimedOut}
              searchFailed={pairing.searchFailed}
              hubRegistrationState={pairing.hubRegistrationState}
              dispatch={dispatch}
              onStartSearch={startSearch}
              onCancel={() => router.push('/product-catalog')}
            />
          )}

          {pairing.stage === 'customize' && (
            <CustomizeStage
              isHubPairing={pairing.isHubPairing}
              product={pairing.product}
              deviceName={pairing.deviceName}
              isFavorite={pairing.isFavorite}
              saving={busy}
              dispatch={dispatch}
              onCustomize={handleCustomize}
            />
          )}

          {pairing.stage === 'completed' && (
            <CompletedStage
              isHubPairing={pairing.isHubPairing}
              activeDevice={pairing.activeDevice}
              productName={productName}
              busy={busy}
              onFinish={handleFinish}
              onPairAnother={handlePairAnother}
            />
          )}
        </div>
      </div>
    </div>
  );
}
