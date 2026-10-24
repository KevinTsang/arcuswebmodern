'use client';

/**
 * Kit Activation page — ported from src/pages/kit-activate/.
 *
 * Guides users through activating devices from a starter kit.
 * Shows a grid of kit devices with their activation status.
 * Devices transition: inactive → customizable → active.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Base, Device, DeviceAdvanced, Product, PairingDevice, PairingSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import type { ListPairingDevicesResponse, GetKitInformationResponse, KitDevice } from '@/arcus/types';
import type { PairingDevice as PairingDeviceData } from '@/store/entityTypes';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { addNotification } from '@/store/slices/uiSlice';
import { endPairingFlow } from '@/store/slices/pairingSlice';

type DeviceState = 'inactive' | 'customizable' | 'active' | 'mispaired' | 'missing';

export default function KitActivatePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const devices = useAppSelector(selectAllDevices);
  const products = useAppSelector((s) => s.place.products);
  const subsystems = useAppSelector((s) => s.subsystems);

  const [kitDevices, setKitDevices] = useState<KitDevice[]>([]);
  const [pairingDevices, setPairingDevices] = useState<PairingDeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [customizingDevice, setCustomizingDevice] = useState<PairingDeviceData | null>(null);
  const [deviceName, setDeviceName] = useState('');

  // Find pairing subsystem address
  const pairingSubAddr = useMemo(() => {
    if (!subsystems?.entities) return null;
    const entries = Object.values(subsystems.entities) as Array<Record<string, unknown>>;
    const sub = entries.find((s) => {
      const addr = s[Base.ATTR_ADDRESS] as string;
      return addr?.includes('subpairing');
    });
    return (sub?.[Base.ATTR_ADDRESS] as string) ?? null;
  }, [subsystems]);

  // Load kit information on mount
  useEffect(() => {
    if (!pairingSubAddr) return;

    const load = async () => {
      setLoading(true);
      try {
        const [kitResp, devResp] = await Promise.all([
          Bridge.request<GetKitInformationResponse>(PairingSubsystem.CMD_GETKITINFORMATION, pairingSubAddr, {}),
          Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {}),
        ]);

        setKitDevices(kitResp.kitInfo ?? []);
        setPairingDevices(devResp.devices ?? []);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to load kit information.' }));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pairingSubAddr, dispatch]);

  // Compute device states
  const deviceStates = useMemo(() => {
    return kitDevices.map((kd) => {
      const pairDev = pairingDevices.find(
        (pd) => pd[PairingDevice.ATTR_PROTOCOLADDRESS] === kd.protocolAddress,
      );

      const realDevice = devices.find((d) => {
        const protocolId = d[DeviceAdvanced.ATTR_PROTOCOLID] as string;
        return protocolId && kd.protocolAddress.includes(protocolId);
      });

      const product = products.find(
        (p) => (p[Product.ATTR_ID] as string) === kd.productId || (p[Base.ATTR_ADDRESS] as string)?.includes(kd.productId),
      );

      let state: DeviceState = 'missing';
      if (realDevice) {
        if (pairDev) {
          const pState = pairDev[PairingDevice.ATTR_PAIRINGSTATE];
          if (pState === PairingDevice.PAIRINGSTATE_MISPAIRED || pState === PairingDevice.PAIRINGSTATE_MISCONFIGURED) {
            state = 'mispaired';
          } else {
            const customs = pairDev[PairingDevice.ATTR_CUSTOMIZATIONS] as string[] | undefined;
            state = customs && customs.length > 0 ? 'active' : 'customizable';
          }
        } else {
          state = 'active';
        }
      } else if (pairDev) {
        state = pairDev[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRING ? 'inactive' : 'missing';
      }

      return {
        kitDevice: kd,
        pairingDevice: pairDev ?? null,
        realDevice: realDevice ?? null,
        product: product ?? null,
        state,
        name: (product?.[Product.ATTR_NAME] as string) ?? kd.productId,
      };
    });
  }, [kitDevices, pairingDevices, devices, products]);

  // Counts
  const counts = useMemo(() => {
    const unactivated = deviceStates.filter((d) => d.state === 'inactive').length;
    const uncustomized = deviceStates.filter((d) => d.state === 'customizable').length;
    const mispaired = deviceStates.filter((d) => d.state === 'mispaired').length;
    const active = deviceStates.filter((d) => d.state === 'active').length;
    const isComplete = unactivated === 0 && uncustomized === 0 && mispaired === 0;
    return { unactivated, uncustomized, mispaired, active, total: deviceStates.length, isComplete };
  }, [deviceStates]);

  // Customize a device
  const handleCustomize = useCallback(async (pairDev: PairingDeviceData) => {
    setCustomizingDevice(pairDev);
    setDeviceName('');
  }, []);

  const saveCustomization = useCallback(async () => {
    if (!customizingDevice) return;

    try {
      await Bridge.request(PairingDevice.CMD_CUSTOMIZE, customizingDevice[Base.ATTR_ADDRESS], {});

      const devAddr = customizingDevice[PairingDevice.ATTR_DEVICEADDRESS] as string;
      if (devAddr && deviceName.trim()) {
        await Bridge.request(Base.CMD_SETATTRIBUTES, devAddr, {
          [Device.ATTR_NAME]: deviceName.trim(),
        });
      }

      await Bridge.request(PairingDevice.CMD_ADDCUSTOMIZATION, customizingDevice[Base.ATTR_ADDRESS], {
        customization: 'NAME',
      });

      // Refresh pairing devices
      if (pairingSubAddr) {
        const resp = await Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {});
        setPairingDevices(resp.devices ?? []);
      }
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to customize device.' }));
    }

    setCustomizingDevice(null);
  }, [customizingDevice, deviceName, pairingSubAddr, dispatch]);

  // Finish kit activation
  const handleFinish = useCallback(async () => {
    if (pairingSubAddr) {
      try {
        await Bridge.request(PairingSubsystem.CMD_DISMISSALL, pairingSubAddr, {});
      } catch {
        // OK
      }
    }
    // DismissAll ends pairing, so the next pairing starts a new flow.
    dispatch(endPairingFlow());
    router.push('/devices');
  }, [pairingSubAddr, router, dispatch]);

  if (loading) {
    return (
      <div className="p-[var(--gutter)] text-center py-12">
        <p className="text-grouse">Loading kit information…</p>
      </div>
    );
  }

  if (kitDevices.length === 0) {
    return (
      <div data-testid="kit-empty" className="p-[var(--gutter)] text-center py-12">
        <p className="text-grouse mb-4">No kit devices found.</p>
        <button
          onClick={() => router.push('/devices')}
          data-testid="kit-go-devices"
          className="text-sm text-peacock hover:underline"
        >
          Go to Devices
        </button>
      </div>
    );
  }

  return (
    <div className="p-[var(--gutter)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 data-testid="kit-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
            Kit Activation
          </h2>
          <p className="text-sm text-grouse mt-1">
            Activate and customize each device in your starter kit.
          </p>
        </div>
        <button
          onClick={handleFinish}
          data-testid="kit-finish"
          data-complete={counts.isComplete}
          className="px-4 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
        >
          {counts.isComplete ? 'Done' : 'Finish Later'}
        </button>
      </div>

      {/* Progress */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] p-3 text-center">
          <div className="text-xl font-light text-swift">{counts.active}</div>
          <p className="text-xs text-grouse mt-0.5">Active</p>
        </div>
        {counts.unactivated > 0 && (
          <div className="flex-1 bg-pigeon/50 rounded-[var(--border-radius-base)] p-3 text-center">
            <div className="text-xl font-light text-swift">{counts.unactivated}</div>
            <p className="text-xs text-grouse mt-0.5">Waiting</p>
          </div>
        )}
        {counts.uncustomized > 0 && (
          <div className="flex-1 bg-peacock/5 border border-peacock/20 rounded-[var(--border-radius-base)] p-3 text-center">
            <div className="text-xl font-light text-swift">{counts.uncustomized}</div>
            <p className="text-xs text-grouse mt-0.5">Ready to Set Up</p>
          </div>
        )}
        {counts.mispaired > 0 && (
          <div className="flex-1 bg-canary/5 border border-canary/20 rounded-[var(--border-radius-base)] p-3 text-center">
            <div className="text-xl font-light text-swift">{counts.mispaired}</div>
            <p className="text-xs text-grouse mt-0.5">Needs Attention</p>
          </div>
        )}
      </div>

      {/* Device grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {deviceStates.map((entry, i) => (
          <KitDeviceCard
            key={`${entry.kitDevice.protocolAddress}-${i}`}
            entry={entry}
            onCustomize={handleCustomize}
          />
        ))}
      </div>

      {/* Customization modal */}
      {customizingDevice && (
        <div className="fixed inset-0 bg-swift/30 flex items-center justify-center z-50 p-4">
          <div className="bg-crane rounded-[var(--border-radius-lg)] border border-heron p-6 w-full max-w-sm shadow-lg">
            <h3 className="text-lg font-semibold text-swift mb-4">Name Your Device</h3>
            <input
              type="text"
              data-testid="kit-device-name"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Device name"
              autoFocus
              className="w-full border border-heron rounded-[var(--border-radius-base)] px-3 py-2 text-sm text-swift focus:outline-none focus:border-peacock mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={saveCustomization}
                data-testid="kit-save"
                className="flex-1 py-2 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
              >
                Save
              </button>
              <button
                onClick={() => setCustomizingDevice(null)}
                className="px-4 py-2 border border-heron rounded-[var(--border-radius-base)] text-sm text-coot hover:bg-pigeon"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KitDeviceCard({
  entry,
  onCustomize,
}: {
  entry: {
    kitDevice: KitDevice;
    pairingDevice: PairingDeviceData | null;
    state: DeviceState;
    name: string;
  };
  onCustomize: (pd: PairingDeviceData) => void;
}) {
  const stateConfig: Record<DeviceState, { label: string; color: string; bgColor: string }> = {
    inactive: { label: 'Waiting', color: 'text-grouse', bgColor: 'bg-pigeon/50' },
    customizable: { label: 'Ready to Set Up', color: 'text-peacock', bgColor: 'bg-peacock/5 border-peacock/20' },
    active: { label: 'Active', color: 'text-honeycreeper', bgColor: 'bg-honeycreeper/5 border-honeycreeper/20' },
    mispaired: { label: 'Needs Attention', color: 'text-canary', bgColor: 'bg-canary/5 border-canary/20' },
    missing: { label: 'Not Found', color: 'text-grouse', bgColor: 'bg-pigeon/50' },
  };

  const config = stateConfig[entry.state];

  return (
    <div data-testid={`kit-device-${entry.kitDevice.protocolAddress}`} data-state={entry.state} className={`border rounded-[var(--border-radius-base)] p-4 ${config.bgColor}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-pigeon rounded-[var(--border-radius-base)] flex items-center justify-center flex-shrink-0">
          <span className="icon-app-devices text-lg text-grouse" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-swift truncate">{entry.name}</p>
          <p data-testid={`kit-device-state-${entry.kitDevice.protocolAddress}`} className={`text-xs mt-0.5 ${config.color}`}>{config.label}</p>
        </div>
      </div>

      {entry.state === 'customizable' && entry.pairingDevice && (
        <button
          onClick={() => onCustomize(entry.pairingDevice!)}
          data-testid={`kit-setup-${entry.kitDevice.protocolAddress}`}
          className="mt-3 w-full py-1.5 bg-peacock text-crane rounded text-xs font-medium hover:bg-peacock/90"
        >
          Set Up
        </button>
      )}

      {entry.state === 'inactive' && (
        <p className="mt-3 text-xs text-grouse">
          Activate the device by pulling its battery tab or plugging it in.
        </p>
      )}

      {entry.state === 'mispaired' && (
        <p className="mt-3 text-xs text-canary">
          This device was not paired correctly. Try resetting it.
        </p>
      )}
    </div>
  );
}
