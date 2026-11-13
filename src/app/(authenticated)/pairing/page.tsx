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
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { setHub } from '@/store/slices/hubSlice';
import { hubFirmwareProgressPercent, hubFirmwareTimedOut, isHubFirmwareState } from '@/lib/hubFirmware';
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
  setHubFirmwareProgress,
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
  HubFirmwareExitModal,
} from '@/components/pairing';

/** Registration errors that end hub polling. */
const TERMINAL_HUB_REGISTRATION_ERRORS: readonly string[] = [
  HUB_REGISTRATION_ERRORS.ALREADY_REGISTERED,
  HUB_REGISTRATION_ERRORS.ORPHANED_HUB,
  HUB_REGISTRATION_ERRORS.INVALID_PARAM,
  HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED,
];

/** The firmware phase the hub is in and when registration first saw it. */
interface FirmwarePhase {
  state: string;
  since: number;
}

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);
  const pairing = useAppSelector((s) => s.pairing);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firmwarePhaseRef = useRef<FirmwarePhase | null>(null);
  const [showFirmwareExit, setShowFirmwareExit] = useState(false);
  const firmwareInProgress = pairing.isHubPairing && isHubFirmwareState(pairing.hubRegistrationState);

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

  // Ask the browser to confirm a reload or close while the hub updates firmware.
  useEffect(() => {
    if (!firmwareInProgress) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [firmwareInProgress]);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    if (!pairingSubAddr) return;

    dispatch(startSearchAction());

    try {
      await Bridge.request(PairingSubsystem.CMD_SEARCH, pairingSubAddr, {
        productAddress: pairing.product?.[Base.ATTR_ADDRESS] ?? '',
      });

      const checkDevices = async () => {
        try {
          const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {});
          const devList = resp.devices ?? [];
          dispatch(setDevices(devList));

          const paired = devList.find(
            (d) => d[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRED,
          );
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
  }, [pairing.product, pairingSubAddr, dispatch]);

  // ── Start Pairing (put hub in search mode) ─────────────────

  const startPairing = useCallback(async () => {
    if (!pairing.product || !pairingSubAddr) return;

    dispatch(setPairingLoading(true));
    try {
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
  }, [pairing.product, pairingSubAddr, dispatch, startSearch]);

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
    firmwarePhaseRef.current = null;

    const failRegistration = (code: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      firmwarePhaseRef.current = null;
      dispatch(hubRegistrationError(code));
    };

    const pollHub = async () => {
      try {
        const placeAddr = `SERV:place:${placeId}`;
        const resp = await Bridge.request<RegisterHubV2Response>(Place.CMD_REGISTERHUBV2, placeAddr, {
          hubId: pairing.hubId.trim().toUpperCase(),
        });

        if (isHubFirmwareState(resp.state)) {
          const now = Date.now();
          const phase = firmwarePhaseRef.current;
          if (!phase || phase.state !== resp.state) {
            firmwarePhaseRef.current = { state: resp.state, since: now };
          } else if (hubFirmwareTimedOut(phase.state, phase.since, now)) {
            // The hub has been stuck downloading or applying for too long.
            failRegistration(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED);
            return;
          }
          dispatch(setHubFirmwareProgress(hubFirmwareProgressPercent(resp.progress)));
        } else {
          firmwarePhaseRef.current = null;
        }

        dispatch(setHubRegistrationState(resp.state));

        if (resp.state === Hub.REGISTRATIONSTATE_REGISTERED) {
          if (pollRef.current) clearInterval(pollRef.current);
          const hubData = resp.hub;
          if (hubData) {
            dispatch(setHub(hubData));
          }
          dispatch(hubRegistered());
        } else if (TERMINAL_HUB_REGISTRATION_ERRORS.includes(resp.state)) {
          failRegistration(resp.state);
        }
      } catch (e) {
        // The platform reports a failed firmware upgrade as an error response.
        const code = (e as { code?: string } | undefined)?.code;
        if (code === HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED) {
          failRegistration(code);
          return;
        }
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
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to save device customization. You can rename the device later from the Devices page.' }));
      }
    }
    dispatch(customizationComplete());
  }, [pairing.isHubPairing, pairing.activeDevice, pairing.deviceName, pairing.isFavorite, hub, dispatch]);

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

  const handlePairAnother = useCallback(() => {
    sessionStorage.removeItem('pairing:product');
    router.push('/product-catalog');
  }, [router]);

  // Leaving mid-update would hide the outcome, so warn instead (legacy firmware-exit).
  const handleBackToCatalog = useCallback(() => {
    if (firmwareInProgress) {
      setShowFirmwareExit(true);
      return;
    }
    router.push('/product-catalog');
  }, [firmwareInProgress, router]);

  const handleDismissFirmwareExit = useCallback(() => setShowFirmwareExit(false), []);

  const productName = pairing.product
    ? `${pairing.product[Product.ATTR_VENDOR] ?? ''} ${pairing.product[Product.ATTR_NAME] ?? ''}`.trim()
    : '';

  return (
    <div className="p-[var(--gutter)]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBackToCatalog}
          data-testid="pairing-back"
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
              hubFirmwareProgress={pairing.hubFirmwareProgress}
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

      <HubFirmwareExitModal open={showFirmwareExit} onAcknowledge={handleDismissFirmwareExit} />
    </div>
  );
}
