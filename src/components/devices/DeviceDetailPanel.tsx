'use client';

/**
 * DeviceDetailPanel — side panel showing device info and management.
 *
 * Replaces src/components/device/detail-panel/ and remove-panel/.
 * Shows device metadata, product info, and provides device removal.
 */

import { useState, useCallback } from 'react';
import { Base, Device, DeviceAdvanced, DevicePower, Identify } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { isDeviceOffline, formatTemp } from '@/hooks/useDeviceConfig';
import { useSidePanel } from '@/components/SidePanel';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useDeviceRemoval } from '@/hooks/useDeviceRemoval';
import { testIdSlug } from '@/lib/testId';
import { DeviceRemovalSection } from './removal/DeviceRemovalSection';

interface DeviceDetailPanelProps {
  address: string;
}

export function DeviceDetailPanel({ address }: DeviceDetailPanelProps) {
  const device = useDevice(address);
  const { closeRight } = useSidePanel();
  const dispatch = useAppDispatch();
  const { sendCommand } = useDeviceActions(address);
  const [identifying, setIdentifying] = useState(false);
  const name = (device?.[Device.ATTR_NAME] as string) ?? 'Unknown Device';
  // Called before the early return below: the device leaves the store when its
  // base:Deleted arrives, and the removal flow must keep running to report it.
  const removal = useDeviceRemoval(address, name, closeRight);

  const handleIdentify = useCallback(async () => {
    setIdentifying(true);
    try {
      await sendCommand(Identify.CMD_IDENTIFY);
    } catch (e) {
      dispatch(addNotification({ type: 'error', message: 'Failed to identify device' }));
    } finally {
      setIdentifying(false);
    }
  }, [sendCommand, dispatch]);

  if (!device) return null;

  const caps = (device[Base.ATTR_CAPS] as string[]) ?? [];
  const supportsIdentify = caps.includes('ident');
  const devType = (device[Device.ATTR_DEVTYPEHINT] as string) ?? '';
  const vendor = (device[Device.ATTR_VENDOR] as string) ?? '';
  const model = (device[Device.ATTR_MODEL] as string) ?? '';
  const productId = (device[Device.ATTR_PRODUCTID] as string) ?? '';
  const offline = isDeviceOffline(device);
  const protocol = (device[DeviceAdvanced.ATTR_PROTOCOL] as string) ?? '';
  const firmwareVersion = (device[DeviceAdvanced.ATTR_FIRMWAREVERSION] as string) ?? '';
  const battery = device[DevicePower.ATTR_BATTERY] as number | undefined;
  const powerSource = (device[DevicePower.ATTR_SOURCE] as string) ?? '';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 data-testid="device-details-title" className="text-lg font-semibold text-swift">Device Details</h3>
        <button onClick={closeRight} className="text-grouse hover:text-swift text-sm">Done</button>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-medium text-swift">{name}</h4>
        {supportsIdentify && (
          <button
            onClick={handleIdentify}
            disabled={identifying}
            data-testid="device-identify"
            className="text-sm text-kingfisher hover:underline disabled:opacity-50"
          >
            {identifying ? 'Identifying...' : 'Identify'}
          </button>
        )}
      </div>

      {/* Info rows */}
      <dl className="space-y-3 mb-8">
        {devType && (
          <InfoRow label="Type" value={devType} />
        )}
        {vendor && (
          <InfoRow label="Manufacturer" value={vendor} />
        )}
        {model && (
          <InfoRow label="Model" value={model} />
        )}
        {productId && (
          <InfoRow label="Product ID" value={productId} />
        )}
        {protocol && (
          <InfoRow label="Protocol" value={formatProtocol(protocol)} />
        )}
        {firmwareVersion && (
          <InfoRow label="Firmware" value={firmwareVersion} />
        )}
        <InfoRow label="Connection" value={offline ? 'Offline' : 'Online'} />
        {powerSource && (
          <InfoRow
            label="Power"
            value={
              powerSource === 'BATTERY' && battery != null
                ? `Battery: ${Math.round(battery)}%`
                : powerSource === 'LINE'
                  ? 'Plugged In'
                  : powerSource
            }
          />
        )}
      </dl>

      {/* Removal section */}
      <hr className="border-heron mb-4" />

      <DeviceRemovalSection name={name} removal={removal} />
    </div>
  );
}

/** Platform protocol codes (devadv:protocol) → display names. */
function formatProtocol(protocol: string): string {
  switch (protocol) {
    case 'ZIGB':
      return 'Zigbee';
    case 'ZWAV':
      return 'Z-Wave';
    case 'IPCD':
      return 'Wi-Fi';
    default:
      return protocol;
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-sm text-grouse">{label}</dt>
      <dd data-testid={`device-detail-${testIdSlug(label)}`} className="text-sm text-swift text-right">{value}</dd>
    </div>
  );
}
