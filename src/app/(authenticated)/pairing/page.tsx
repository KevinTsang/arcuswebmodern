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
import Bridge from '@arcus/core/bridge';
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
  PAIRING_STATES,
} from '@/components/pairing';
import type { PairingDevice, PairingStep } from '@/components/pairing';

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);
  const pairing = useAppSelector((s) => s.pairing);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const addr = s['base:address'] as string;
      return addr?.includes('subpairing');
    });
    return (sub?.['base:address'] as string) ?? null;
  })();

  // Stop pairing on unmount or page refresh/close
  useEffect(() => {
    const stopPairing = () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (pairingSubAddr) {
        Bridge.request('subpairing:StopSearching', pairingSubAddr, {}).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', stopPairing);
    return () => {
      window.removeEventListener('beforeunload', stopPairing);
      stopPairing();
    };
  }, [pairingSubAddr]);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    if (!pairingSubAddr) return;

    dispatch(startSearchAction());

    try {
      await Bridge.request('subpairing:Search', pairingSubAddr, {
        productAddress: pairing.product?.['base:address'] ?? '',
      });

      const checkDevices = async () => {
        try {
          const resp = await Bridge.request('subpairing:ListPairingDevices', pairingSubAddr, {});
          const devList = (resp['devices'] as PairingDevice[]) ?? [];
          dispatch(setDevices(devList));

          const paired = devList.find(
            (d) => d['pairdev:pairingState'] === PAIRING_STATES.PAIRED,
          );
          if (paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            dispatch(devicePaired({
              device: paired,
              defaultName: paired['pairdev:deviceAddress']
                ? ''
                : (pairing.product?.['product:name'] ?? 'New Device'),
            }));
          }

          const mispaired = devList.find(
            (d) =>
              d['pairdev:pairingState'] === PAIRING_STATES.MISPAIRED ||
              d['pairdev:pairingState'] === PAIRING_STATES.MISCONFIGURED,
          );
          if (mispaired && !paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            dispatch(deviceMispaired(mispaired));
          }
        } catch {
          // Polling error, continue
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
      const resp = await Bridge.request('subpairing:StartPairing', pairingSubAddr, {
        productAddress: pairing.product['base:address'],
      });

      const pairingSteps = (resp['steps'] as PairingStep[]) ?? [];
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
      const productId = parsed['product:id'];
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
        const resp = await Bridge.request('place:RegisterHubV2', placeAddr, {
          hubId: pairing.hubId.trim().toUpperCase(),
        });

        const regState = resp['state'] as string;
        dispatch(setHubRegistrationState(regState));

        if (regState === 'REGISTERED') {
          if (pollRef.current) clearInterval(pollRef.current);
          const hubData = resp['hub'] as Record<string, unknown>;
          if (hubData) {
            dispatch(setHub(hubData));
          }
          dispatch(hubRegistered());
        } else if (
          regState === 'error.register.alreadyregistered' ||
          regState === 'error.register.orphanedhub' ||
          regState === 'request.param.invalid'
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          dispatch(hubRegistrationError(regState));
        }
      } catch {
        // Continue polling
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
          const hubAddr = hub['base:address'] as string;
          await Bridge.request('base:SetAttributes', hubAddr, {
            'dev:name': pairing.deviceName.trim(),
          });
        } catch {
          // Non-critical
        }
      }
      dispatch(customizationComplete());
      return;
    }

    if (pairing.activeDevice) {
      try {
        await Bridge.request('pairdev:Customize', pairing.activeDevice['base:address'], {});

        if (pairing.deviceName.trim()) {
          const devAddr = pairing.activeDevice['pairdev:deviceAddress'] as string;
          if (devAddr) {
            await Bridge.request('base:SetAttributes', devAddr, {
              'dev:name': pairing.deviceName.trim(),
            });
          }
        }

        await Bridge.request('pairdev:AddCustomization', pairing.activeDevice['base:address'], {
          customization: 'NAME',
        });

        if (pairing.isFavorite) {
          await Bridge.request('pairdev:AddCustomization', pairing.activeDevice['base:address'], {
            customization: 'FAVORITE',
          });
        }
      } catch {
        // Non-critical
      }
    }
    dispatch(customizationComplete());
  }, [pairing.isHubPairing, pairing.activeDevice, pairing.deviceName, pairing.isFavorite, hub, dispatch]);

  // ── Finish ─────────────────────────────────────────────────

  const handleFinish = useCallback(async () => {
    if (pairingSubAddr) {
      try {
        await Bridge.request('subpairing:DismissAll', pairingSubAddr, {});
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
    ? `${pairing.product['product:vendor'] ?? ''} ${pairing.product['product:name'] ?? ''}`.trim()
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
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
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
