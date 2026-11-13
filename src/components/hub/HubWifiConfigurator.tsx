'use client';

/**
 * HubWifiConfigurator — scans for Wi-Fi networks from the hub and connects it
 * to one. Ported from legacy's hub wifi-scan configurator.
 *
 * hubwifi:WiFiStartScan starts a scan on the hub, which then sends
 * hubwifi:WiFiScanResults events with every network seen so far. The hub can
 * only scan while it is on Ethernet, so the scan is offered only then.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { Base, HubNetwork, HubWiFi } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  HUB_WIFI_SCAN_RESULTS,
  WIFI_SCAN_TIMEOUT_SECONDS,
  toNetworks,
  type HubNetworkStatus,
  type HubWifiScanResultsEvent,
  type WifiNetwork,
} from '@/lib/hubWifi';
import { HubWifiNetworkList } from './HubWifiNetworkList';
import { HubWifiConnectForm } from './HubWifiConnectForm';

type View = 'initial' | 'networks' | 'connect';

interface HubWifiConfiguratorProps {
  status: HubNetworkStatus;
  /** Start a scan as soon as the configurator opens (from hub pairing). */
  autoScan?: boolean;
}

function titleFor(status: HubNetworkStatus): string {
  if (status.online && status.connectionType === HubNetwork.TYPE_3G) return 'Connect Hub to Ethernet or Wi-Fi';
  if (status.online && status.wifiSsid) return 'Update Wi-Fi';
  return 'Connect Hub to Wi-Fi';
}

function summaryFor(status: HubNetworkStatus): string {
  if (!status.online) {
    return 'Hub disconnected. Ensure the Ethernet cable is inserted into your Hub. It may take a few minutes to reconnect once the cable is reinserted.';
  }
  if (status.connectionType === HubNetwork.TYPE_3G) {
    return 'You are on Cellular Backup because there may be an issue with your connection. Ensure the Ethernet cable is plugged into the Hub once the issue is resolved.';
  }
  if (status.wifiSsid) {
    return 'If you need to change Wi-Fi networks, make sure your Ethernet cable is plugged in, and Scan again.';
  }
  return 'To get started, scan for available Wi-Fi networks and then select the one you want to use. Ensure the Ethernet cable stays inserted into your Hub until the Wi-Fi setup is finished.';
}

export function HubWifiConfigurator({ status, autoScan = false }: HubWifiConfiguratorProps) {
  const dispatch = useAppDispatch();
  const [view, setView] = useState<View>('initial');
  const [scanning, setScanning] = useState(false);
  const [networks, setNetworks] = useState<WifiNetwork[]>([]);
  /** The network being joined; null joins one by name. */
  const [selected, setSelected] = useState<WifiNetwork | null>(null);
  /** Scan results are wanted: a scan is running, or its networks are on screen. */
  const listeningRef = useRef(false);
  /** A scan was started here, so leaving ends it. */
  const startedRef = useRef(false);

  const { address, online, connectionType } = status;
  const onEthernet = connectionType === HubNetwork.TYPE_ETH;
  const scanEnabled = online && onEthernet && !scanning;

  const startScan = useCallback(async () => {
    listeningRef.current = true;
    startedRef.current = true;
    setView('initial');
    setScanning(true);
    try {
      await Bridge.request(HubWiFi.CMD_WIFISTARTSCAN, address, { timeout: WIFI_SCAN_TIMEOUT_SECONDS });
    } catch {
      listeningRef.current = false;
      setScanning(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to scan for Wi-Fi networks. Make sure the hub is online.' }));
    }
  }, [address, dispatch]);

  useEffect(() => {
    const onResults = (event: HubWifiScanResultsEvent) => {
      if (!listeningRef.current || event[Base.ATTR_ADDRESS] !== address) return;
      setNetworks(toNetworks(event.scanResults));
      setScanning(false);
      setView((v) => (v === 'initial' ? 'networks' : v));
    };
    cornea.on(HUB_WIFI_SCAN_RESULTS, onResults);
    return () => {
      cornea.off(HUB_WIFI_SCAN_RESULTS, onResults);
    };
  }, [address]);

  // End a scan this configurator started when it closes; a no-op on the hub if the scan already ended.
  useEffect(() => () => {
    if (startedRef.current) Bridge.request(HubWiFi.CMD_WIFIENDSCAN, address, {}).catch(() => {});
  }, [address]);

  // From hub pairing, scan straight away (legacy's autoScan). Only on open.
  const autoScanRef = useRef(autoScan && online);
  useEffect(() => {
    if (autoScanRef.current) {
      autoScanRef.current = false;
      void startScan();
    }
  }, [startScan]);

  const handleSelect = useCallback((network: WifiNetwork) => {
    setSelected(network);
    setView('connect');
  }, []);

  const handleOther = useCallback(() => {
    setSelected(null);
    setView('connect');
  }, []);

  const handleCancel = useCallback(() => {
    setView('networks');
  }, []);

  const handleConnected = useCallback(() => {
    listeningRef.current = false;
    setNetworks([]);
    setSelected(null);
    setView('initial');
  }, []);

  return (
    <section data-testid="hub-wifi-configurator" className="space-y-3">
      <h4 data-testid="hub-wifi-title" className="text-sm font-semibold text-swift">{titleFor(status)}</h4>

      {view === 'initial' && (
        <>
          <p data-testid="hub-wifi-summary" className={`text-sm ${online ? 'text-grouse' : 'text-cardinal'}`}>
            {summaryFor(status)}
          </p>
          {online && (
            <button
              type="button"
              data-testid="hub-wifi-scan"
              onClick={startScan}
              disabled={!scanEnabled}
              className="px-4 py-2 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50"
            >
              {scanning ? 'Scanning…' : 'Scan'}
            </button>
          )}
          {online && !onEthernet && (
            <p data-testid="hub-wifi-ethernet-required" className="text-xs text-grouse">
              Plug the Ethernet cable into the Hub to scan for networks.
            </p>
          )}
        </>
      )}

      {view === 'networks' && (
        <>
          <HubWifiNetworkList
            networks={networks}
            currentSsid={status.wifiSsid}
            onSelect={handleSelect}
            onOther={handleOther}
          />
          <button
            type="button"
            data-testid="hub-wifi-rescan"
            onClick={startScan}
            disabled={!scanEnabled}
            className="text-sm text-peacock hover:underline disabled:opacity-50"
          >
            Scan Again
          </button>
        </>
      )}

      {view === 'connect' && (
        <HubWifiConnectForm
          key={selected?.ssid ?? '_other'}
          hubAddress={address}
          network={selected}
          onConnected={handleConnected}
          onCancel={handleCancel}
        />
      )}
    </section>
  );
}
