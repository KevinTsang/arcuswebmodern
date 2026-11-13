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
 *
 * Cloud products follow the legacy flows: OAuth products (Nest, Honeywell,
 * Lutron, …) sign in to the vendor account in a popup instead of searching,
 * and cloud (IPCD) products send the pairing form's values with Search.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Base, Device, Product, PairingDevice, PairingSubsystem, Hub, Place } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import type { ListPairingDevicesResponse, StartPairingResponse, RegisterHubV2Response } from '@/arcus/types';
import { formValuesForSearch, isOAuthProduct, supportUrl, type PairingFormValues } from '@/lib/cloudPairing';
import { useOAuthPopup } from '@/hooks/useOAuthPopup';
import { HUB_REGISTRATION_ERRORS } from '@/arcus/types';
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
  setPairingConfig,
  startOAuth,
  setOAuthStatus,
  setSearchError,
  returnToSteps,
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
  OAuthConnectStage,
} from '@/components/pairing';

/** How long to wait for a device to pair before giving up (ms). */
const SEARCH_TIMEOUT_MS = 180000;
/** How often to poll the pairing subsystem for pairing devices (ms). */
const DEVICE_POLL_MS = 3000;
/** Shown when the platform rejects the details entered for a cloud device. */
const CLOUD_SEARCH_ERROR = 'We don\'t recognize that code. Confirm the code entered is correct.';
/** Error codes meaning the hub, not the entered code, is the problem. */
const HUB_UNAVAILABLE_CODES = ['hub.missing', 'hub.offline'];

/** Attributes for subpairing:Search. */
interface SearchAttributes {
  productAddress: string;
  form?: PairingFormValues;
}

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);
  const pairing = useAppSelector((s) => s.pairing);
  const redirectBaseUrl = useAppSelector((s) => s.auth.person?.redirectBaseUrl);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOAuth = pairing.pairingMode === PairingSubsystem.PAIRINGMODE_OAUTH || isOAuthProduct(pairing.product);
  const isCloud = pairing.pairingMode === PairingSubsystem.PAIRINGMODE_CLOUD
    || pairing.product?.[Product.ATTR_PAIRINGMODE] === Product.PAIRINGMODE_IPCD;

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  }, []);

  // ── OAuth popup ────────────────────────────────────────────

  const handlePopupClosed = useCallback(() => {
    dispatch(setOAuthStatus('closed'));
  }, [dispatch]);

  const handlePopupComplete = useCallback(() => {
    dispatch(setOAuthStatus('authorized'));
  }, [dispatch]);

  const handlePopupExitToCatalog = useCallback(() => {
    router.push('/product-catalog');
  }, [router]);

  const handlePopupExitToSupport = useCallback(() => {
    dispatch(setOAuthStatus('closed'));
    const url = supportUrl(redirectBaseUrl);
    if (url) window.open(url, '_blank', 'noopener');
  }, [dispatch, redirectBaseUrl]);

  const oauthPopup = useOAuthPopup({
    onClosed: handlePopupClosed,
    onComplete: handlePopupComplete,
    onExitToCatalog: handlePopupExitToCatalog,
    onExitToSupport: handlePopupExitToSupport,
  });
  const { open: openPopup, focus: focusPopup, close: closePopup } = oauthPopup;

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
      stopPolling();
      if (pairingSubAddr) {
        Bridge.request(PairingSubsystem.CMD_STOPSEARCHING, pairingSubAddr, {}).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', stopPairing);
    return () => {
      window.removeEventListener('beforeunload', stopPairing);
      stopPairing();
    };
  }, [pairingSubAddr, stopPolling]);

  // ── Poll for pairing devices ───────────────────────────────

  const checkDevices = useCallback(async () => {
    if (!pairingSubAddr) return;
    try {
      const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {});
      const devList = resp.devices ?? [];
      dispatch(setDevices(devList));

      const paired = devList.find(
        (d) => d[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRED,
      );
      if (paired) {
        stopPolling();
        closePopup();
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
        stopPolling();
        closePopup();
        dispatch(deviceMispaired(mispaired));
      }
    } catch (e) {
      console.warn('Pairing device poll failed:', e);
    }
  }, [pairing.product, pairingSubAddr, dispatch, stopPolling, closePopup]);

  const startDevicePolling = useCallback((onTimeout: () => void) => {
    stopPolling();
    pollRef.current = setInterval(checkDevices, DEVICE_POLL_MS);
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      onTimeout();
    }, SEARCH_TIMEOUT_MS);
  }, [checkDevices, stopPolling]);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    if (!pairingSubAddr) return;

    dispatch(startSearchAction());

    try {
      const attributes: SearchAttributes = {
        productAddress: pairing.product?.[Base.ATTR_ADDRESS] ?? '',
      };
      if (pairing.form.length > 0) {
        attributes.form = formValuesForSearch(pairing.form, pairing.formValues);
      }
      await Bridge.request(PairingSubsystem.CMD_SEARCH, pairingSubAddr, attributes);

      startDevicePolling(() => dispatch(searchTimedOut()));
    } catch (e: unknown) {
      const code = (e as { code?: string } | undefined)?.code ?? '';
      if (isCloud && !HUB_UNAVAILABLE_CODES.includes(code)) {
        dispatch(setSearchError(CLOUD_SEARCH_ERROR));
      } else {
        dispatch(addNotification({ type: 'error', message: 'Failed to search for devices.' }));
      }
    }
  }, [pairing.product, pairing.form, pairing.formValues, pairingSubAddr, isCloud, dispatch, startDevicePolling]);

  // ── OAuth sign-in (cloud-to-cloud products) ────────────────

  const openOAuthPopup = useCallback(() => {
    if (!pairing.oauthUrl) {
      dispatch(addNotification({ type: 'error', message: 'Sign-in is not available for this product right now.' }));
      return;
    }
    dispatch(startOAuth());
    if (!openPopup(pairing.oauthUrl)) {
      dispatch(setOAuthStatus('blocked'));
      return;
    }
    startDevicePolling(() => {
      closePopup();
      dispatch(setOAuthStatus('timedOut'));
    });
  }, [pairing.oauthUrl, openPopup, closePopup, startDevicePolling, dispatch]);

  const handleShowSteps = useCallback(() => {
    stopPolling();
    closePopup();
    dispatch(returnToSteps());
  }, [stopPolling, closePopup, dispatch]);

  const handleContinue = useCallback(() => {
    if (isOAuth) {
      openOAuthPopup();
    } else {
      startSearch();
    }
  }, [isOAuth, openOAuthPopup, startSearch]);

  // ── Start Pairing (put hub in search mode) ─────────────────

  const startPairing = useCallback(async () => {
    if (!pairing.product || !pairingSubAddr) return;

    dispatch(setPairingLoading(true));
    try {
      const resp = await Bridge.request<StartPairingResponse>(PairingSubsystem.CMD_STARTPAIRING, pairingSubAddr, {
        productAddress: pairing.product[Base.ATTR_ADDRESS],
      });

      const pairingSteps = resp.steps ?? [];
      dispatch(setPairingConfig({ ...resp, steps: pairingSteps }));

      // OAuth sign-in opens a popup, which needs a click; forms need input.
      const needsUserAction = resp.mode === PairingSubsystem.PAIRINGMODE_OAUTH
        || isOAuthProduct(pairing.product)
        || (resp.form ?? []).some((input) => input.type !== 'HIDDEN');
      if (pairingSteps.length === 0 && !needsUserAction) {
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

    const pollHub = async () => {
      try {
        const placeAddr = `SERV:place:${placeId}`;
        const resp = await Bridge.request<RegisterHubV2Response>(Place.CMD_REGISTERHUBV2, placeAddr, {
          hubId: pairing.hubId.trim().toUpperCase(),
        });

        dispatch(setHubRegistrationState(resp.state));

        if (resp.state === Hub.REGISTRATIONSTATE_REGISTERED) {
          stopPolling();
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
          stopPolling();
          dispatch(hubRegistrationError(resp.state));
        }
      } catch (e) {
        console.warn('Hub registration poll failed:', e);
      }
    };

    pollRef.current = setInterval(pollHub, 5000);
    pollHub();
  }, [pairing.hubId, placeId, dispatch, stopPolling]);

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
              form={pairing.form}
              formValues={pairing.formValues}
              isOAuth={isOAuth}
              dispatch={dispatch}
              onStartSearch={handleContinue}
              onStartHubRegistration={handleStartHubRegistration}
              onCancel={() => router.push('/product-catalog')}
            />
          )}

          {pairing.stage === 'searching' && pairing.oauthStatus && (
            <OAuthConnectStage
              vendor={pairing.product?.[Product.ATTR_VENDOR] ?? ''}
              status={pairing.oauthStatus}
              devices={pairing.devices}
              onFocusPopup={focusPopup}
              onRetry={openOAuthPopup}
              onShowSteps={handleShowSteps}
              onCancel={() => router.push('/product-catalog')}
            />
          )}

          {pairing.stage === 'searching' && !pairing.oauthStatus && (
            <SearchingStage
              product={pairing.product}
              isHubPairing={pairing.isHubPairing}
              devices={pairing.devices}
              searchTimedOut={pairing.searchTimedOut}
              hubRegistrationState={pairing.hubRegistrationState}
              searchError={pairing.searchError}
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
