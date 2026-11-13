'use client';

/**
 * HubWifiNetworkList — the networks a hub scan found, strongest first, plus
 * "Join Other Network" for one the scan didn't list (e.g. a hidden SSID).
 */

import { HubWiFi } from '@arcus/core';
import { signalBars, type WifiNetwork } from '@/lib/hubWifi';

interface HubWifiNetworkListProps {
  networks: WifiNetwork[];
  /** The hub's configured SSID, marked in the list. */
  currentSsid: string;
  onSelect: (network: WifiNetwork) => void;
  onOther: () => void;
}

export function HubWifiNetworkList({ networks, currentSsid, onSelect, onOther }: HubWifiNetworkListProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-swift">Choose Wi-Fi Network</p>
      {networks.length === 0 && (
        <p data-testid="hub-wifi-no-networks" className="text-sm text-grouse">
          No Wi-Fi networks were found. Scan again, or join a network by name.
        </p>
      )}
      <ul className="border border-heron rounded-[var(--border-radius-base)] divide-y divide-heron">
        {networks.map((network) => {
          const secured = network.securities.some((s) => s !== HubWiFi.WIFISECURITY_NONE);
          const bars = signalBars(network.signal);
          return (
            <li key={network.ssid}>
              <button
                type="button"
                data-testid={`hub-wifi-network-${network.ssid}`}
                onClick={() => onSelect(network)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-swift hover:bg-pigeon"
              >
                <span className="flex-1 truncate">
                  {network.ssid}
                  {network.ssid === currentSsid && <span className="ml-2 text-xs text-lovebird">Current</span>}
                </span>
                {secured && <span className="icon-platform-lock-1 text-grouse" aria-label="Secured" />}
                <span
                  className={`icon-app-wi-fi-${bars} text-grouse`}
                  aria-label={`Signal ${bars} of 4`}
                  data-testid={`hub-wifi-signal-${network.ssid}`}
                />
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            data-testid="hub-wifi-network-other"
            onClick={onOther}
            className="w-full px-3 py-2 text-left text-sm text-peacock hover:bg-pigeon"
          >
            Join Other Network
          </button>
        </li>
      </ul>
    </div>
  );
}
