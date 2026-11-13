'use client';

/**
 * HubWifiSetupPrompt — on the hub pairing completion screen, offers Wi-Fi
 * setup for a Wi-Fi-capable hub (when ARCUS_ENABLE_HUB_WIFI_SCAN is on), and
 * once a network is configured shows the hub's connection. Ported from
 * legacy's pairing customize/completed/hub component.
 */

import { useCallback, useMemo } from 'react';
import { HubNetwork } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import { HubSettingsPanel } from '@/components/hub/HubSettingsPanel';
import {
  connectionLabel,
  hasConfiguredWifi,
  isHubWifiScanEnabled,
  readHubNetworkStatus,
} from '@/lib/hubWifi';

export default function HubWifiSetupPrompt() {
  const hub = useAppSelector((s) => s.hub.hub);
  const { openRight } = useSidePanel();
  const status = useMemo(() => (hub ? readHubNetworkStatus(hub) : null), [hub]);

  const handleConfigure = useCallback(() => {
    openRight(<HubSettingsPanel autoScan />, { title: 'Hub Settings', key: 'hub-settings' });
  }, [openRight]);

  if (!status || !status.wifiCapable || !isHubWifiScanEnabled()) return null;

  if (hasConfiguredWifi(status)) {
    return (
      <div data-testid="hub-wifi-setup-status" className="text-sm text-coot mb-4 space-y-1">
        <p>
          <strong>Current Connection:</strong> <em data-testid="hub-wifi-setup-connection">{connectionLabel(status)}</em>
        </p>
        <p>
          <strong>Wi-Fi Network:</strong> <em data-testid="hub-wifi-setup-ssid">{status.wifiSsid}</em>
        </p>
        {status.connectionType !== HubNetwork.TYPE_WIFI && (
          <p data-testid="hub-wifi-setup-unplug" className="text-cardinal font-medium">
            To complete Wi-Fi setup, please unplug your Ethernet cable.
          </p>
        )}
      </div>
    );
  }

  return (
    <p data-testid="hub-wifi-setup-prompt" className="text-sm text-grouse mb-4">
      To stay connected to the internet without an Ethernet cable, consider{' '}
      <button
        type="button"
        data-testid="hub-wifi-setup-link"
        onClick={handleConfigure}
        className="text-peacock hover:underline"
      >
        connecting the Hub to your Wi-Fi network
      </button>
      .
    </p>
  );
}
