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

import { useCallback, useEffect, useRef } from 'react';
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
  setPairingLoading,
  setSteps,
  startHubRegistration as startHubRegistrationAction,
  hubRegistered,
  setHubRegistrationState,
  hubRegistrationError,
  customizationComplete,
  resetPairing,
} from '@/store/slices/pairingSlice';
import {
  StageIndicator,
  StepsStage,
  SearchingStage,
  CustomizeStage,
  CompletedStage,
} from '@/components/pairing';

function isPaired(device: PairingDeviceData): boolean {
  return device[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRED;
}

/**
 * The pairing list holds every pairing device at the place, including ones from
 * earlier sessions that were never dismissed. Only a device that became PAIRED
 * during this session and that no client has customized yet is ours to customize.
 */
function isNewlyPaired(device: PairingDeviceData, pairedBeforeSession: ReadonlySet<string>): boolean {
  return isPaired(device)
    && !pairedBeforeSession.has(device[Base.ATTR_ADDRESS])
    && (device[PairingDevice.ATTR_CUSTOMIZATIONS] ?? []).length === 0;
}

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);
  const pairing = useAppSelector((s) => s.pairing);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Addresses of pairing devices that were already PAIRED when this session started.
  const pairedBeforeSessionRef = useRef<Set<string> | null>(null);
  // Pairing devices this session has dismissed, so they aren't dismissed twice.
  const dismissedRef = useRef<Set<string>>(new Set());

  // Reset pairing state on mount/unmount
  useEffect(() => {
    dispatch(resetPairing());
    return () => {
      dispatch(resetPairing());
    };
  }, [dispatch]);

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

  // Stop pairing on unmount or page refresh/close
  useEffect(() => {
    const stopPairing = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pairingSubAddr) {
        Bridge.request(PairingSubsystem.CMD_STOPSEARCHING, pairingSubAddr, {}).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', stopPairing);
    return () => {
      window.removeEventListener('beforeunload', stopPairing);
      stopPairing();
    };
  }, [pairingSubAddr]);

  // ── Pairing device bookkeeping ─────────────────────────────

  // Record which devices were already PAIRED before this session put the hub
  // into pairing mode (StartPairing or Search, whichever comes first), so the
  // poller ignores them. Taken once per session; searching again keeps it.
  const snapshotPairedDevices = useCallback(async () => {
    if (!pairingSubAddr || pairedBeforeSessionRef.current) return;
    const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {});
    pairedBeforeSessionRef.current = new Set(
      (resp.devices ?? []).filter(isPaired).map((d) => d[Base.ATTR_ADDRESS]),
    );
  }, [pairingSubAddr]);

  // Remove a PAIRED device from the pairing list once the user is done with it.
  // Best-effort: the device itself is already paired, and DismissAll on Finish
  // sweeps up anything left behind, so a failure here isn't surfaced.
  const dismissPairingDevice = useCallback(async (device: PairingDeviceData) => {
    const address = device[Base.ATTR_ADDRESS];
    if (!isPaired(device) || dismissedRef.current.has(address)) return;
    try {
      await Bridge.request(PairingDevice.CMD_DISMISS, address, {});
      dismissedRef.current.add(address);
    } catch (e) {
      console.warn('Failed to dismiss pairing device:', e);
    }
  }, []);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    if (!pairingSubAddr) return;

    dispatch(startSearchAction());

    try {
      await snapshotPairedDevices();
      await Bridge.request(PairingSubsystem.CMD_SEARCH, pairingSubAddr, {
        productAddress: pairing.product?.[Base.ATTR_ADDRESS] ?? '',
      });

      const checkDevices = async () => {
        try {
          const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {});
          const devList = resp.devices ?? [];
          dispatch(setDevices(devList));

          const pairedBeforeSession = pairedBeforeSessionRef.current ?? new Set<string>();
          const paired = devList.find((d) => isNewlyPaired(d, pairedBeforeSession));
          if (paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            dispatch(devicePaired({
              device: paired,
              defaultName: paired[PairingDevice.ATTR_DEVICEADDRESS]
                ? ''
                : (pairing.product?.[Product.ATTR_NAME] ?? 'New Device'),
            }));
          }

          const mispaired = devList.find(
            (d) =>
              d[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_MISPAIRED ||
              d[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_MISCONFIGURED,
          );
          if (mispaired && !paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            dispatch(deviceMispaired(mispaired));
          }
        } catch (e) {
          console.warn('Pairing device poll failed:', e);
        }
      };

      pollRef.current = setInterval(checkDevices, 3000);

      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          dispatch(searchTimedOut());
        }
      }, 180000);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to search for devices.' }));
    }
  }, [pairing.product, pairingSubAddr, dispatch, snapshotPairedDevices]);

  // ── Start Pairing (put hub in search mode) ─────────────────

  const startPairing = useCallback(async () => {
    if (!pairing.product || !pairingSubAddr) return;

    dispatch(setPairingLoading(true));
    try {
      await snapshotPairedDevices();
      const resp = await Bridge.request<StartPairingResponse>(PairingSubsystem.CMD_STARTPAIRING, pairingSubAddr, {
        productAddress: pairing.product[Base.ATTR_ADDRESS],
      });

      const pairingSteps = resp.steps ?? [];
      dispatch(setSteps(pairingSteps));

      if (pairingSteps.length === 0) {
        startSearch();
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to start pairing. Check hub connection.' }));
    } finally {
      dispatch(setPairingLoading(false));
    }
  }, [pairing.product, pairingSubAddr, dispatch, startSearch, snapshotPairedDevices]);

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
      dispatch(customizationComplete());
      return;
    }

    if (pairing.activeDevice) {
      try {
        await Bridge.request(PairingDevice.CMD_CUSTOMIZE, pairing.activeDevice[Base.ATTR_ADDRESS], {});

        if (pairing.deviceName.trim()) {
          const devAddr = pairing.activeDevice[PairingDevice.ATTR_DEVICEADDRESS] as string;
          if (devAddr) {
            await Bridge.request(Base.CMD_SETATTRIBUTES, devAddr, {
              [Device.ATTR_NAME]: pairing.deviceName.trim(),
            });
          }
        }

        await Bridge.request(PairingDevice.CMD_ADDCUSTOMIZATION, pairing.activeDevice[Base.ATTR_ADDRESS], {
          customization: 'NAME',
        });

        if (pairing.isFavorite) {
          await Bridge.request(PairingDevice.CMD_ADDCUSTOMIZATION, pairing.activeDevice[Base.ATTR_ADDRESS], {
            customization: 'FAVORITE',
          });
        }

        await dismissPairingDevice(pairing.activeDevice);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to save device customization. You can rename the device later from the Devices page.' }));
      }
    }
    dispatch(customizationComplete());
  }, [pairing.isHubPairing, pairing.activeDevice, pairing.deviceName, pairing.isFavorite, hub, dispatch, dismissPairingDevice]);

  // ── Finish ─────────────────────────────────────────────────

  const handleFinish = useCallback(async () => {
    if (pairingSubAddr) {
      try {
        await Bridge.request(PairingSubsystem.CMD_DISMISSALL, pairingSubAddr, {});
      } catch {
        // OK
      }
    }
    sessionStorage.removeItem('pairing:product');
    router.push('/devices');
  }, [pairingSubAddr, router]);

  // Pair Another skips DismissAll (the exit-pairing call, which also clears the
  // post-pairing Z-Wave rebuild prompt), so dismiss the device we just finished
  // with or the next search would still see it.
  const handlePairAnother = useCallback(async () => {
    if (pairing.activeDevice) {
      await dismissPairingDevice(pairing.activeDevice);
    }
    sessionStorage.removeItem('pairing:product');
    router.push('/product-catalog');
  }, [pairing.activeDevice, dismissPairingDevice, router]);

  const productName = pairing.product
    ? `${pairing.product[Product.ATTR_VENDOR] ?? ''} ${pairing.product[Product.ATTR_NAME] ?? ''}`.trim()
    : '';

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
              devices={pairing.devices}
              searchTimedOut={pairing.searchTimedOut}
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
              dispatch={dispatch}
              onCustomize={handleCustomize}
            />
          )}

          {pairing.stage === 'completed' && (
            <CompletedStage
              isHubPairing={pairing.isHubPairing}
              activeDevice={pairing.activeDevice}
              productName={productName}
              onFinish={handleFinish}
              onPairAnother={handlePairAnother}
            />
          )}
        </div>
      </div>
    </div>
  );
}
