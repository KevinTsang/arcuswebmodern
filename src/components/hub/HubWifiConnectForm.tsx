'use client';

/**
 * HubWifiConnectForm — credentials for the chosen network, then
 * hubwifi:WiFiConnect.
 *
 * WiFiConnect replies CONNECTING once the hub starts testing the network, and
 * the outcome arrives later as a hubwifi:WiFiConnectResult event, so the form
 * stays in its saving state until that event (or a refusal) comes back.
 * Ported from legacy's arcus-wifi-scan form.
 */

import { useState, useCallback, useEffect, useRef, type FormEvent } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { Base, HubWiFi } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  HUB_WIFI_CONNECT_RESULT,
  SECURITY_OPTIONS,
  WIFI_CONNECT_FAILED_MESSAGE,
  WIFI_CONNECT_RESULT_OK,
  WIFI_CONNECT_STATUS_CONNECTING,
  connectFailureMessage,
  preferredSecurity,
  type HubWifiConnectResponse,
  type HubWifiConnectResultEvent,
  type WifiNetwork,
} from '@/lib/hubWifi';

interface HubWifiConnectFormProps {
  hubAddress: string;
  /** The network chosen from the scan, or null to join one by name. */
  network: WifiNetwork | null;
  onConnected: (ssid: string) => void;
  onCancel: () => void;
}

interface FieldErrors {
  ssid?: string;
  password?: string;
}

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm text-swift bg-crane border border-heron rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock';

export function HubWifiConnectForm({ hubAddress, network, onConnected, onCancel }: HubWifiConnectFormProps) {
  const dispatch = useAppDispatch();
  const known = network !== null;
  const [ssid, setSsid] = useState(network?.ssid ?? '');
  const [security, setSecurity] = useState(
    network ? preferredSecurity(network.securities) : HubWiFi.WIFISECURITY_WPA2_PSK,
  );
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  /** The SSID a connect is waiting on a WiFiConnectResult for. */
  const pendingRef = useRef<string | null>(null);

  const passwordRequired = security !== HubWiFi.WIFISECURITY_NONE;
  const showSecurity = !known || (network?.securities.length ?? 0) > 1;

  useEffect(() => {
    const onResult = (event: HubWifiConnectResultEvent) => {
      const pending = pendingRef.current;
      if (pending === null || event[Base.ATTR_ADDRESS] !== hubAddress) return;
      pendingRef.current = null;
      setSaving(false);
      if (event.status === WIFI_CONNECT_RESULT_OK) {
        dispatch(addNotification({ type: 'success', message: `Hub connected to ${pending}.` }));
        onConnected(pending);
      } else {
        setError(connectFailureMessage(event.status));
      }
    };
    cornea.on(HUB_WIFI_CONNECT_RESULT, onResult);
    return () => {
      cornea.off(HUB_WIFI_CONNECT_RESULT, onResult);
    };
  }, [hubAddress, dispatch, onConnected]);

  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    const name = known ? ssid : ssid.trim();
    const errors: FieldErrors = {};
    if (!name) errors.ssid = 'Enter the network name.';
    if (passwordRequired && !password) errors.password = 'Enter the network password.';
    setFieldErrors(errors);
    if (errors.ssid || errors.password) return;

    setError(null);
    setSaving(true);
    pendingRef.current = name;
    try {
      const resp = await Bridge.request<HubWifiConnectResponse>(HubWiFi.CMD_WIFICONNECT, hubAddress, {
        ssid: name,
        ...(known && network.bssid ? { bssid: network.bssid } : {}),
        security,
        ...(passwordRequired ? { key: password } : {}),
      });
      if (resp?.status !== WIFI_CONNECT_STATUS_CONNECTING) {
        pendingRef.current = null;
        setSaving(false);
        setError(connectFailureMessage(resp?.status));
      }
      // Otherwise wait for the WiFiConnectResult.
    } catch {
      pendingRef.current = null;
      setSaving(false);
      setError(WIFI_CONNECT_FAILED_MESSAGE);
      dispatch(addNotification({ type: 'error', message: 'Failed to connect the hub to Wi-Fi.' }));
    }
  }, [known, ssid, passwordRequired, password, hubAddress, network, security, dispatch]);

  return (
    <form onSubmit={handleSubmit} noValidate data-testid="hub-wifi-connect-form" className="space-y-3">
      <p className="text-sm font-medium text-swift">
        Chosen Wi-Fi Network:{' '}
        <em data-testid="hub-wifi-chosen-network">{known ? network.ssid : 'Other'}</em>
      </p>

      {!known && (
        <div>
          <label htmlFor="hub-wifi-ssid" className="block text-xs text-coot mb-1">Wi-Fi Network Name</label>
          <input
            id="hub-wifi-ssid"
            data-testid="hub-wifi-ssid"
            type="text"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            disabled={saving}
            className={INPUT_CLASS}
          />
          {fieldErrors.ssid && <p data-testid="hub-wifi-ssid-error" className="text-xs text-cardinal mt-1">{fieldErrors.ssid}</p>}
        </div>
      )}

      {showSecurity && (
        <div>
          <label htmlFor="hub-wifi-security" className="block text-xs text-coot mb-1">Security Setting</label>
          <select
            id="hub-wifi-security"
            data-testid="hub-wifi-security"
            value={security}
            onChange={(e) => setSecurity(e.target.value)}
            disabled={saving}
            className={INPUT_CLASS}
          >
            {SECURITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <p className="text-xs text-grouse mt-1">
            WPA2 is recommended for optimal security. All Arcus communications are encrypted even if your network is unsecured.
          </p>
        </div>
      )}

      {passwordRequired && (
        <div>
          <label htmlFor="hub-wifi-password" className="block text-xs text-coot mb-1">Wi-Fi Network Password</label>
          <input
            id="hub-wifi-password"
            data-testid="hub-wifi-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={saving}
            className={INPUT_CLASS}
          />
          {fieldErrors.password && (
            <p data-testid="hub-wifi-password-error" className="text-xs text-cardinal mt-1">{fieldErrors.password}</p>
          )}
        </div>
      )}

      {error && <p data-testid="hub-wifi-connect-error" role="alert" className="text-sm text-cardinal">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="hub-wifi-connect"
          disabled={saving}
          className="px-4 py-2 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Connecting…' : error ? 'Try Again' : 'Connect'}
        </button>
        <button
          type="button"
          data-testid="hub-wifi-cancel"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-heron text-coot rounded-[var(--border-radius-base)] hover:bg-pigeon"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
