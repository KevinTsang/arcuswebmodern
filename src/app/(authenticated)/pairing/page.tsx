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

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { setHub } from '@/store/slices/hubSlice';

type PairingStage = 'steps' | 'searching' | 'customize' | 'completed';

interface PairingProduct {
  'base:address': string;
  'product:name': string;
  'product:vendor': string;
  'product:hubRequired': boolean;
  'product:pairingMode'?: string;
  'product:id': string;
  [key: string]: unknown;
}

interface PairingDevice {
  'base:address': string;
  'pairdev:pairingState': string;
  'pairdev:pairingPhase': string;
  'pairdev:productAddress'?: string;
  'pairdev:deviceAddress'?: string;
  'pairdev:customizations'?: string[];
  [key: string]: unknown;
}

interface PairingStep {
  id: string;
  order: number;
  instructions: string[];
  title?: string;
  [key: string]: unknown;
}

const PAIRING_STATES = {
  PAIRING: 'PAIRING',
  PAIRED: 'PAIRED',
  MISPAIRED: 'MISPAIRED',
  MISCONFIGURED: 'MISCONFIGURED',
} as const;

const PAIRING_PHASES = {
  JOIN: 'JOIN',
  CONNECT: 'CONNECT',
  IDENTIFY: 'IDENTIFY',
  PREPARE: 'PREPARE',
  CONFIGURE: 'CONFIGURE',
  PAIRED: 'PAIRED',
  FAILED: 'FAILED',
} as const;

export default function PairingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hub = useAppSelector((s) => s.hub.hub);
  const placeId = useAppSelector((s) => s.place.placeId);
  const subsystems = useAppSelector((s) => s.subsystems);

  const [stage, setStage] = useState<PairingStage>('steps');
  const [product, setProduct] = useState<PairingProduct | null>(null);
  const [steps, setSteps] = useState<PairingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [devices, setDevices] = useState<PairingDevice[]>([]);
  const [searchTimedOut, setSearchTimedOut] = useState(false);
  const [loading, setLoading] = useState(false);

  // Hub registration state
  const [isHubPairing, setIsHubPairing] = useState(false);
  const [hubId, setHubId] = useState('');
  const [hubRegState, setHubRegState] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Customization state
  const [deviceName, setDeviceName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeDevice, setActiveDevice] = useState<PairingDevice | null>(null);

  // Load product from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('pairing:product');
      if (stored) {
        const parsed = JSON.parse(stored) as PairingProduct;
        setProduct(parsed);

        // Detect if this is hub pairing
        const productId = parsed['product:id'];
        if (productId === 'dee000' || productId === 'dee001') {
          setIsHubPairing(true);
        }
      } else {
        router.replace('/product-catalog');
      }
    } catch {
      router.replace('/product-catalog');
    }
  }, [router]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      // Stop searching when leaving
      if (pairingSubAddr) {
        Bridge.request('subpairing:StopSearching', pairingSubAddr, {}).catch(() => {});
      }
    };
  }, [pairingSubAddr]);

  // ── Start Pairing (put hub in search mode) ─────────────────

  const startPairing = useCallback(async () => {
    if (!product || !pairingSubAddr) return;

    setLoading(true);
    try {
      const resp = await Bridge.request('subpairing:StartPairing', pairingSubAddr, {
        productAddress: product['base:address'],
      });

      // Extract steps from response
      const pairingSteps = (resp['steps'] as PairingStep[]) ?? [];
      setSteps(pairingSteps);
      setCurrentStep(0);

      if (pairingSteps.length === 0) {
        // No steps needed, go straight to searching
        startSearch();
      }
    } catch (err) {
      dispatch(addNotification({ type: 'error', message: 'Failed to start pairing. Check hub connection.' }));
    } finally {
      setLoading(false);
    }
  }, [product, pairingSubAddr, dispatch]);

  // Auto-start pairing when product is loaded (non-hub)
  useEffect(() => {
    if (product && !isHubPairing && pairingSubAddr) {
      startPairing();
    }
  }, [product, isHubPairing, pairingSubAddr, startPairing]);

  // ── Search for device ──────────────────────────────────────

  const startSearch = useCallback(async () => {
    if (!product || !pairingSubAddr) return;

    setStage('searching');
    setSearchTimedOut(false);
    setDevices([]);

    try {
      await Bridge.request('subpairing:Search', pairingSubAddr, {
        productAddress: product['base:address'],
      });

      // Poll for pairing devices
      const checkDevices = async () => {
        try {
          const resp = await Bridge.request('subpairing:ListPairingDevices', pairingSubAddr, {});
          const devList = (resp['devices'] as PairingDevice[]) ?? [];
          setDevices(devList);

          // Check if any device is paired
          const paired = devList.find(
            (d) => d['pairdev:pairingState'] === PAIRING_STATES.PAIRED,
          );
          if (paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveDevice(paired);
            setDeviceName(
              (paired['pairdev:deviceAddress']
                ? ''
                : (product['product:name'] ?? 'New Device')) as string,
            );
            setStage('customize');
          }

          // Check for mispaired
          const mispaired = devList.find(
            (d) =>
              d['pairdev:pairingState'] === PAIRING_STATES.MISPAIRED ||
              d['pairdev:pairingState'] === PAIRING_STATES.MISCONFIGURED,
          );
          if (mispaired && !paired) {
            if (pollRef.current) clearInterval(pollRef.current);
            setActiveDevice(mispaired);
            setStage('completed');
          }
        } catch {
          // Polling error, continue
        }
      };

      pollRef.current = setInterval(checkDevices, 3000);

      // Timeout after 3 minutes
      setTimeout(() => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          setSearchTimedOut(true);
        }
      }, 180000);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to search for devices.' }));
    }
  }, [product, pairingSubAddr, dispatch]);

  // ── Hub Registration ───────────────────────────────────────

  const startHubRegistration = useCallback(async () => {
    if (!hubId.trim() || !placeId) return;

    setStage('searching');
    setHubRegState('OFFLINE');
    setLoading(true);

    const pollHub = async () => {
      try {
        const placeAddr = `SERV:place:${placeId}`;
        const resp = await Bridge.request('place:RegisterHubV2', placeAddr, {
          hubId: hubId.trim().toUpperCase(),
        });

        const state = resp['state'] as string;
        setHubRegState(state);

        if (state === 'REGISTERED') {
          if (pollRef.current) clearInterval(pollRef.current);
          const hubData = resp['hub'] as Record<string, unknown>;
          if (hubData) {
            dispatch(setHub(hubData));
          }
          setStage('customize');
          setLoading(false);
        } else if (
          state === 'error.register.alreadyregistered' ||
          state === 'error.register.orphanedhub' ||
          state === 'request.param.invalid'
        ) {
          if (pollRef.current) clearInterval(pollRef.current);
          setHubRegState(state);
          setLoading(false);
        }
      } catch {
        // Continue polling
      }
    };

    pollRef.current = setInterval(pollHub, 5000);
    // Initial call
    pollHub();
  }, [hubId, placeId, dispatch]);

  // ── Customization ──────────────────────────────────────────

  const handleCustomize = useCallback(async () => {
    if (isHubPairing) {
      // Hub: just set name
      if (hub && deviceName.trim()) {
        try {
          const hubAddr = hub['base:address'] as string;
          await Bridge.request('base:SetAttributes', hubAddr, {
            'dev:name': deviceName.trim(),
          });
        } catch {
          // Non-critical
        }
      }
      setStage('completed');
      return;
    }

    // Device: call Customize + AddCustomization
    if (activeDevice) {
      try {
        await Bridge.request('pairdev:Customize', activeDevice['base:address'], {});

        if (deviceName.trim()) {
          const devAddr = activeDevice['pairdev:deviceAddress'] as string;
          if (devAddr) {
            await Bridge.request('base:SetAttributes', devAddr, {
              'dev:name': deviceName.trim(),
            });
          }
        }

        await Bridge.request('pairdev:AddCustomization', activeDevice['base:address'], {
          customization: 'NAME',
        });

        if (isFavorite) {
          await Bridge.request('pairdev:AddCustomization', activeDevice['base:address'], {
            customization: 'FAVORITE',
          });
        }
      } catch {
        // Non-critical
      }
    }
    setStage('completed');
  }, [isHubPairing, hub, activeDevice, deviceName, isFavorite]);

  // ── Finish ─────────────────────────────────────────────────

  const handleFinish = useCallback(async () => {
    // Dismiss all and clean up
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

  // ── No product ─────────────────────────────────────────────

  if (!product) {
    return (
      <div className="p-[var(--gutter)] text-center py-12">
        <p className="text-grouse">Loading product…</p>
      </div>
    );
  }

  const productName = `${product['product:vendor'] ?? ''} ${product['product:name'] ?? ''}`.trim();

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
          Pair {productName}
        </h2>
      </div>

      <div className="max-w-lg mx-auto">
        {/* Stage indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(['steps', 'searching', 'customize', 'completed'] as PairingStage[]).map((s, i) => {
            const stageIndex = ['steps', 'searching', 'customize', 'completed'].indexOf(stage);
            return (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    i < stageIndex
                      ? 'bg-honeycreeper text-crane'
                      : i === stageIndex
                        ? 'bg-peacock text-crane'
                        : 'bg-pigeon text-grouse'
                  }`}
                >
                  {i < stageIndex ? '\u2713' : i + 1}
                </div>
                {i < 3 && (
                  <div className={`w-8 h-0.5 ${i < stageIndex ? 'bg-honeycreeper' : 'bg-pigeon'}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Stage content */}
        <div className="bg-crane border border-heron rounded-[var(--border-radius-lg)] p-6">
          {/* ── Steps Stage ─────────────────────── */}
          {stage === 'steps' && !isHubPairing && (
            <div>
              <h3 className="text-lg font-semibold text-swift mb-4">Pairing Instructions</h3>
              {steps.length > 0 ? (
                <>
                  <div className="text-sm text-grouse mb-2">
                    Step {currentStep + 1} of {steps.length}
                  </div>
                  <div className="bg-pigeon/30 rounded-[var(--border-radius-base)] p-4 mb-4 min-h-[100px]">
                    {steps[currentStep]?.instructions?.map((inst, i) => (
                      <p key={i} className="text-sm text-swift mb-2 last:mb-0">
                        {inst}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {currentStep > 0 && (
                      <button
                        onClick={() => setCurrentStep((c) => c - 1)}
                        className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
                      >
                        Previous
                      </button>
                    )}
                    {currentStep < steps.length - 1 ? (
                      <button
                        onClick={() => setCurrentStep((c) => c + 1)}
                        className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        onClick={startSearch}
                        className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                      >
                        Search for Device
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-grouse mb-4">
                    Follow the manufacturer instructions to put your device in pairing mode, then click below.
                  </p>
                  <button
                    onClick={startSearch}
                    disabled={loading}
                    className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
                  >
                    {loading ? 'Starting…' : 'Search for Device'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Hub ID Entry (hub pairing steps) ── */}
          {stage === 'steps' && isHubPairing && (
            <div>
              <h3 className="text-lg font-semibold text-swift mb-4">Register Your Hub</h3>
              <p className="text-sm text-grouse mb-4">
                Find the Hub ID on the bottom of your hub. It looks like AAA-NNNN.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-swift mb-1">Hub ID</label>
                <input
                  type="text"
                  value={hubId}
                  onChange={(e) => setHubId(e.target.value)}
                  placeholder="AAA-0000"
                  className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock uppercase"
                />
              </div>
              <button
                onClick={startHubRegistration}
                disabled={!hubId.trim() || loading}
                className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
              >
                Register Hub
              </button>
            </div>
          )}

          {/* ── Searching Stage ─────────────────── */}
          {stage === 'searching' && !isHubPairing && (
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold text-swift mb-4">Searching for Device</h3>
              {!searchTimedOut ? (
                <>
                  <div className="animate-pulse mb-4">
                    <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="icon-app-devices text-2xl text-peacock" />
                    </div>
                  </div>
                  <p className="text-sm text-grouse mb-2">
                    Looking for your {product['product:name']}…
                  </p>
                  {devices.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {devices.map((d) => (
                        <DeviceStateRow key={d['base:address']} device={d} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm text-swift mb-2">Search timed out</p>
                  <p className="text-sm text-grouse mb-4">
                    No devices were found. Make sure your device is in pairing mode and within range of the hub.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={startSearch}
                      className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => router.push('/product-catalog')}
                      className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Hub Registration Searching ─────── */}
          {stage === 'searching' && isHubPairing && (
            <div className="text-center py-6">
              <h3 className="text-lg font-semibold text-swift mb-4">Registering Hub</h3>
              {hubRegState === 'REGISTERED' ? (
                <p className="text-sm text-honeycreeper font-medium">Hub registered successfully!</p>
              ) : hubRegState?.startsWith('error') ? (
                <>
                  <p className="text-sm text-cardinal mb-4">
                    {hubRegState === 'error.register.alreadyregistered'
                      ? 'This hub is already registered to another account.'
                      : hubRegState === 'error.register.orphanedhub'
                        ? 'This hub needs to be reset. Please contact support.'
                        : 'Invalid Hub ID. Please check and try again.'}
                  </p>
                  <button
                    onClick={() => {
                      setStage('steps');
                      setHubRegState(null);
                      setHubId('');
                    }}
                    className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium"
                  >
                    Try Again
                  </button>
                </>
              ) : (
                <>
                  <div className="animate-pulse mb-4">
                    <div className="w-16 h-16 bg-peacock/10 rounded-full flex items-center justify-center mx-auto">
                      <span className="icon-platform-hub-1 text-2xl text-peacock" />
                    </div>
                  </div>
                  <p className="text-sm text-grouse">
                    {hubRegState === 'DOWNLOADING'
                      ? 'Downloading firmware update…'
                      : hubRegState === 'APPLYING'
                        ? 'Applying firmware update…'
                        : 'Waiting for hub to connect…'}
                  </p>
                  <p className="text-xs text-grouse mt-2">This may take a few minutes.</p>
                </>
              )}
            </div>
          )}

          {/* ── Customize Stage ─────────────────── */}
          {stage === 'customize' && (
            <div>
              <h3 className="text-lg font-semibold text-swift mb-4">
                {isHubPairing ? 'Name Your Hub' : 'Customize Your Device'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-swift mb-1">
                    {isHubPairing ? 'Hub Name' : 'Device Name'}
                  </label>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder={isHubPairing ? 'My Hub' : product['product:name']}
                    className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock"
                  />
                </div>
                {!isHubPairing && (
                  <label className="flex items-center gap-2 text-sm text-coot">
                    <input
                      type="checkbox"
                      checked={isFavorite}
                      onChange={(e) => setIsFavorite(e.target.checked)}
                      className="accent-peacock"
                    />
                    Add to favorites
                  </label>
                )}
                <button
                  onClick={handleCustomize}
                  className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                >
                  {isHubPairing ? 'Save & Continue' : 'Save & Finish'}
                </button>
              </div>
            </div>
          )}

          {/* ── Completed Stage ─────────────────── */}
          {stage === 'completed' && (
            <div className="text-center py-6">
              {activeDevice?.['pairdev:pairingState'] === PAIRING_STATES.MISPAIRED ||
              activeDevice?.['pairdev:pairingState'] === PAIRING_STATES.MISCONFIGURED ? (
                <>
                  <div className="w-16 h-16 bg-canary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="icon-app-warning text-2xl text-canary" />
                  </div>
                  <h3 className="text-lg font-semibold text-swift mb-2">Improperly Paired</h3>
                  <p className="text-sm text-grouse mb-4">
                    The device was not paired correctly. Try removing it and pairing again.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-honeycreeper/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl text-honeycreeper">&#10003;</span>
                  </div>
                  <h3 className="text-lg font-semibold text-swift mb-2">
                    {isHubPairing ? 'Hub Ready!' : 'Device Paired!'}
                  </h3>
                  <p className="text-sm text-grouse mb-4">
                    {isHubPairing
                      ? 'Your hub is connected and ready to use.'
                      : `${productName} has been successfully paired.`}
                  </p>
                </>
              )}
              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleFinish}
                  className="px-6 py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
                >
                  Go to Devices
                </button>
                <button
                  onClick={handlePairAnother}
                  className="px-4 py-2.5 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
                >
                  Pair Another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceStateRow({ device }: { device: PairingDevice }) {
  const state = device['pairdev:pairingState'];
  const phase = device['pairdev:pairingPhase'];

  let statusText = 'Discovering…';
  let statusColor = 'text-grouse';

  if (state === PAIRING_STATES.PAIRING) {
    switch (phase) {
      case PAIRING_PHASES.JOIN:
      case PAIRING_PHASES.CONNECT:
        statusText = 'Connecting…';
        break;
      case PAIRING_PHASES.IDENTIFY:
        statusText = 'Identifying…';
        break;
      case PAIRING_PHASES.PREPARE:
      case PAIRING_PHASES.CONFIGURE:
        statusText = 'Configuring…';
        break;
      case PAIRING_PHASES.PAIRED:
        statusText = 'Ready';
        statusColor = 'text-honeycreeper';
        break;
      default:
        statusText = 'Pairing…';
    }
  } else if (state === PAIRING_STATES.PAIRED) {
    statusText = 'Paired';
    statusColor = 'text-honeycreeper';
  } else if (state === PAIRING_STATES.MISPAIRED || state === PAIRING_STATES.MISCONFIGURED) {
    statusText = 'Improperly Paired';
    statusColor = 'text-canary';
  }

  return (
    <div className="flex items-center justify-between px-3 py-2 border border-heron rounded text-sm">
      <span className="text-swift">Device Found</span>
      <span className={statusColor}>{statusText}</span>
    </div>
  );
}
