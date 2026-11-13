'use client';

/**
 * HubSettingsPanel — side panel for the hub: its name, connection and, when
 * ARCUS_ENABLE_HUB_WIFI_SCAN is on and the hub has Wi-Fi, Wi-Fi setup.
 * Ported from legacy's hub configuration panel.
 */

import { useCallback, useMemo } from 'react';
import { HubNetwork } from '@arcus/core';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useSidePanel } from '@/components/SidePanel';
import { connectionLabel, isHubWifiScanEnabled, readHubNetworkStatus } from '@/lib/hubWifi';
import { HubNameField } from './HubNameField';
import { HubWifiConfigurator } from './HubWifiConfigurator';

interface HubSettingsPanelProps {
  /** Opened from hub pairing: start the Wi-Fi scan straight away. */
  autoScan?: boolean;
}

export function HubSettingsPanel({ autoScan = false }: HubSettingsPanelProps) {
  const hub = useAppSelector((s) => s.hub.hub);
  const dispatch = useAppDispatch();
  const { closeRight } = useSidePanel();
  const status = useMemo(() => (hub ? readHubNetworkStatus(hub) : null), [hub]);

  const handleDone = useCallback(() => {
    // The hub only switches to a new network once its Ethernet cable is out.
    if (status?.wifiSsid && status.connectionType === HubNetwork.TYPE_ETH) {
      dispatch(addNotification({ type: 'info', message: 'Please unplug the Ethernet cable to complete Wi-Fi setup.' }));
    }
    closeRight();
  }, [status, dispatch, closeRight]);

  if (!status) {
    return (
      <div className="p-4">
        <p data-testid="hub-settings-no-hub" className="text-sm text-grouse">No hub is paired at this place.</p>
      </div>
    );
  }

  const showWifi = status.wifiCapable && isHubWifiScanEnabled();
  const connection = connectionLabel(status);

  return (
    <div data-testid="hub-settings-panel" className="p-4 space-y-6">
      <HubNameField key={status.name} address={status.address} name={status.name} />

      <section className="space-y-1">
        <h4 className="text-sm font-semibold text-swift">Connectivity</h4>
        <p className="text-sm text-coot">
          Connection: <span data-testid="hub-settings-connection">{connection || 'Unknown'}</span>
        </p>
        {status.wifiCapable && status.wifiSsid && (
          <p className="text-sm text-coot">
            Wi-Fi Network: <span data-testid="hub-settings-ssid">{status.wifiSsid}</span>
          </p>
        )}
      </section>

      {showWifi && (
        <div className="border-t border-heron pt-4">
          <HubWifiConfigurator status={status} autoScan={autoScan} />
        </div>
      )}

      <button
        type="button"
        data-testid="hub-settings-done"
        onClick={handleDone}
        className="px-6 py-2 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90"
      >
        Done
      </button>
    </div>
  );
}
