'use client';

/**
 * ZWaveNetworkCard — Z-Wave controller details (hubzwave:* attributes) and,
 * on request, the network topology from hubzwave:NetworkInformation: per-node
 * metrics, neighbors and routes, plus any zombie nodes left on the chip.
 */

import { useCallback, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Hub, HubZwave } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import InfoRow from '@/components/settings/InfoRow';
import { TestIdScope } from '@/lib/testIdScope';
import { formatPlatformJson } from './formatPlatformJson';
import { ZWaveNodeTable } from './ZWaveNodeTable';
import type { HubAdvancedAttributes, ZWaveNetworkInformation } from './hubAdvancedTypes';

interface ZWaveNetworkCardProps {
  hub: HubAdvancedAttributes;
}

function yesNo(value: boolean | undefined): string {
  if (value === undefined) return '-';
  return value ? 'Yes' : 'No';
}

function healStatus(hub: HubAdvancedAttributes): string {
  if (hub[HubZwave.ATTR_HEALINPROGRESS]) {
    const percent = hub[HubZwave.ATTR_HEALPERCENT];
    return percent !== undefined ? `In progress (${Math.round(percent * 100)}%)` : 'In progress';
  }
  const finished = hub[HubZwave.ATTR_HEALLASTFINISH];
  if (finished) return `Last rebuilt ${new Date(finished).toLocaleString()}`;
  return 'Never rebuilt';
}

export function ZWaveNetworkCard({ hub }: ZWaveNetworkCardProps) {
  const dispatch = useAppDispatch();
  const [info, setInfo] = useState<ZWaveNetworkInformation | null>(null);
  const [loading, setLoading] = useState(false);

  const address = hub[Base.ATTR_ADDRESS];
  const offline = hub[Hub.ATTR_STATE] === Hub.STATE_DOWN;
  const zombies = info?.zombies;
  const hasZombies = Array.isArray(zombies) ? zombies.length > 0 : zombies !== undefined && zombies !== null;

  const loadNetwork = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Bridge.request<ZWaveNetworkInformation>(HubZwave.CMD_NETWORKINFORMATION, address, {});
      setInfo(response ?? {});
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load Z-Wave network information' }));
    }
    setLoading(false);
  }, [address, dispatch]);

  return (
    <section data-testid="hub-zwave" className="border border-heron rounded-[var(--border-radius-base)] p-4">
      <h3 data-testid="hub-zwave-title" className="text-sm font-medium text-swift mb-3">Z-Wave Network</h3>

      <TestIdScope.Provider value="hub-zwave">
        <div className="space-y-2 mb-3">
          <InfoRow label="Devices" value={String(hub[HubZwave.ATTR_NUMDEVICES] ?? 0)} />
          <InfoRow label="Home ID" value={hub[HubZwave.ATTR_HOMEID] || '-'} />
          <InfoRow label="Controller State" value={hub[HubZwave.ATTR_STATE] || '-'} />
          <InfoRow label="Firmware" value={hub[HubZwave.ATTR_FIRMWARE] || '-'} />
          <InfoRow label="Protocol" value={hub[HubZwave.ATTR_PROTOCOL] || '-'} />
          <InfoRow label="Static Update Controller" value={yesNo(hub[HubZwave.ATTR_ISSUC])} />
          <InfoRow label="Secondary Controller" value={yesNo(hub[HubZwave.ATTR_ISSECONDARY])} />
          <InfoRow label="Network Rebuild" value={healStatus(hub)} />
        </div>
      </TestIdScope.Provider>

      {hub[HubZwave.ATTR_HEALRECOMMENDED] && (
        <p data-testid="hub-zwave-heal-recommended" className="text-xs text-swift bg-pigeon rounded-[var(--border-radius-base)] px-3 py-2 mb-3">
          A network rebuild is recommended. Start one from Devices &rsaquo; Z-Wave Tools.
        </p>
      )}

      <button
        onClick={loadNetwork}
        disabled={offline || loading}
        data-testid="hub-zwave-load"
        className="bg-peacock text-crane px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50 mb-3"
      >
        {loading ? 'Analyzing network...' : info ? 'Refresh Network Topology' : 'Show Network Topology'}
      </button>
      {offline && (
        <p data-testid="hub-zwave-offline" className="text-xs text-cardinal mb-2">
          The hub is offline. Reconnect it to read its Z-Wave network.
        </p>
      )}

      {info && (
        <div data-testid="hub-zwave-topology" className="space-y-3">
          {hasZombies && (
            <p data-testid="hub-zwave-zombies" className="text-xs text-cardinal">
              Zombie nodes on the Z-Wave chip: {formatPlatformJson(zombies)}. Remove them from Devices &rsaquo; Z-Wave Tools.
            </p>
          )}
          <ZWaveNodeTable info={info} />
        </div>
      )}
    </section>
  );
}
