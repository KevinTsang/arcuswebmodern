'use client';

/**
 * Devices page — ported from src/pages/devices/.
 *
 * Two views: "Devices" (device list with hub panel) and "Z-Wave Tools"
 * (network rebuild and device removal guidance).
 */

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Bridge from '@arcus/core/bridge';
import { Base, Place, PairingDevice, PairingSubsystem, HubConnection } from '@arcus/core';
import type { ListPairingDevicesResponse, GetKitInformationResponse } from '@/arcus/types';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { DeviceList, HubPanel, ZWaveTools } from '@/components/device';

type ViewMode = 'devices' | 'zwave';

export default function DevicesPage() {
  const [view, setView] = useState<ViewMode>('devices');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const placeName = useAppSelector(
    (s) => s.place.place?.[Place.ATTR_NAME] ?? 'Your Home',
  );
  const hub = useAppSelector((s) => s.hub.hub);
  const devices = useAppSelector(selectAllDevices);
  const subsystems = useAppSelector((s) => s.subsystems);

  const hasHub = !!hub;
  const hasDevices = devices.length > 0;

  const pairingSubAddr = useMemo(() => {
    if (!subsystems?.entities) return null;
    const entries = Object.values(subsystems.entities) as Array<Record<string, unknown>>;
    const sub = entries.find((s) => {
      const addr = s[Base.ATTR_ADDRESS] as string;
      return addr?.includes('subpairing');
    });
    return (sub?.[Base.ATTR_ADDRESS] as string) ?? null;
  }, [subsystems]);

  const handleAddHubOrKit = useCallback(async () => {
    if (!hub) {
      router.push('/hub-setup');
      return;
    }
    if (!pairingSubAddr) {
      router.push('/hub-setup');
      return;
    }
    try {
      const [devResp, kitResp] = await Promise.all([
        Bridge.request<ListPairingDevicesResponse>(PairingSubsystem.CMD_LISTPAIRINGDEVICES, pairingSubAddr, {}),
        Bridge.request<GetKitInformationResponse>(PairingSubsystem.CMD_GETKITINFORMATION, pairingSubAddr, {}),
      ]);
      const devices = devResp.devices ?? [];
      const kitInfo = kitResp.kitInfo ?? [];
      const unpaired = kitInfo.filter((kd) =>
        devices.some(
          (pd) =>
            kd.protocolAddress === pd[PairingDevice.ATTR_PROTOCOLADDRESS] &&
            pd[PairingDevice.ATTR_PAIRINGSTATE] === PairingDevice.PAIRINGSTATE_PAIRING,
        ),
      );
      if (unpaired.length > 0) {
        if (hub[HubConnection.ATTR_STATE] === HubConnection.STATE_OFFLINE) {
          dispatch(addNotification({ type: 'error', message: 'Hub Offline. Re-connect your Hub and then try to pair.' }));
        } else {
          router.push('/kit-activate');
        }
      } else {
        dispatch(addNotification({ type: 'info', message: 'Your Hub is already paired. No kit devices awaiting activation.' }));
      }
    } catch (e) {
      console.error('Failed to check kit devices:', e);
      dispatch(addNotification({ type: 'error', message: 'Unable to check for kit devices. Verify your hub is online.' }));
    }
  }, [hub, pairingSubAddr, router, dispatch]);

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Devices
        </h2>
        <span className="text-sm text-grouse">{placeName}</span>
      </div>

      {/* View toggle + add device */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1">
          <button
            onClick={() => setView('devices')}
            className={`
              px-4 py-1.5 rounded text-sm font-medium transition-colors
              ${view === 'devices' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'}
            `}
          >
            Devices
          </button>
          <button
            onClick={() => setView('zwave')}
            className={`
              px-4 py-1.5 rounded text-sm font-medium transition-colors
              ${view === 'zwave' ? 'bg-crane text-swift shadow-sm' : 'text-grouse hover:text-coot'}
            `}
          >
            Z-Wave Tools
          </button>
        </div>

        {hasHub && view === 'devices' && (
          <Link
            href="/pairing"
            className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 transition-opacity"
          >
            + Add Device
          </Link>
        )}
      </div>

      {/* Main content */}
      {view === 'devices' ? (
        !hasHub && !hasDevices ? (
          // No devices upsell
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-pigeon flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-grouse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-swift mb-2">No Devices Paired</h3>
            <p className="text-sm text-grouse mb-6 max-w-md mx-auto">
              Pair a hub and devices to start controlling your smart home.
              Visit the Product Catalog to browse available devices.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleAddHubOrKit}
                className="bg-peacock text-crane px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 transition-opacity"
              >
                Add a Hub or Smart Kit
              </button>
              <Link
                href="/product-catalog"
                className="inline-block bg-heron text-swift px-6 py-2.5 rounded-[var(--border-radius-base)] text-sm border border-grouse hover:bg-crane transition-colors"
              >
                Shop Devices
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <HubPanel />
            <DeviceList />
          </div>
        )
      ) : (
        <ZWaveTools />
      )}
    </div>
  );
}
