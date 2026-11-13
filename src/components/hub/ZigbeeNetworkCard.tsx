'use client';

/**
 * ZigbeeNetworkCard — Zigbee radio details (channel, PAN id, transmit power;
 * hubzigbee:* attributes) and, on request, the counters the Zigbee chip keeps
 * (hubzigbee:GetStats).
 */

import { useCallback, useMemo, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { Base, Hub, HubZigbee } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import InfoRow from '@/components/settings/InfoRow';
import { TestIdScope } from '@/lib/testIdScope';
import { testIdSlug } from '@/lib/testId';
import { formatHex } from './formatPlatformJson';
import type { HubAdvancedAttributes, ZigbeeStatsResponse } from './hubAdvancedTypes';

interface ZigbeeNetworkCardProps {
  hub: HubAdvancedAttributes;
}

export function ZigbeeNetworkCard({ hub }: ZigbeeNetworkCardProps) {
  const dispatch = useAppDispatch();
  const [stats, setStats] = useState<{ [counter: string]: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const address = hub[Base.ATTR_ADDRESS];
  const offline = hub[Hub.ATTR_STATE] === Hub.STATE_DOWN;
  const channel = hub[HubZigbee.ATTR_CHANNEL];
  const power = hub[HubZigbee.ATTR_POWER];

  const counters = useMemo(
    () => (stats ? Object.entries(stats).sort(([a], [b]) => a.localeCompare(b)) : []),
    [stats],
  );

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Bridge.request<ZigbeeStatsResponse>(HubZigbee.CMD_GETSTATS, address, {});
      setStats(response?.stats ?? {});
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to load Zigbee radio statistics' }));
    }
    setLoading(false);
  }, [address, dispatch]);

  return (
    <section data-testid="hub-zigbee" className="border border-heron rounded-[var(--border-radius-base)] p-4">
      <h3 data-testid="hub-zigbee-title" className="text-sm font-medium text-swift mb-3">Zigbee Network</h3>

      <TestIdScope.Provider value="hub-zigbee">
        <div className="space-y-2 mb-3">
          <InfoRow label="Channel" value={channel !== undefined ? String(channel) : '-'} />
          <InfoRow label="PAN ID" value={formatHex(hub[HubZigbee.ATTR_PANID])} />
          <InfoRow label="Transmit Power" value={power !== undefined ? `${power} dBm` : '-'} />
          <InfoRow label="Power Mode" value={hub[HubZigbee.ATTR_POWERMODE] || '-'} />
          <InfoRow label="Network State" value={hub[HubZigbee.ATTR_STATE] || '-'} />
          <InfoRow label="Radio Firmware" value={hub[HubZigbee.ATTR_VERSION] || '-'} />
        </div>
      </TestIdScope.Provider>

      <button
        onClick={loadStats}
        disabled={offline || loading}
        data-testid="hub-zigbee-load"
        className="bg-peacock text-crane px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50 mb-3"
      >
        {loading ? 'Loading...' : stats ? 'Refresh Radio Statistics' : 'Show Radio Statistics'}
      </button>
      {offline && (
        <p data-testid="hub-zigbee-offline" className="text-xs text-cardinal mb-2">
          The hub is offline. Reconnect it to read its Zigbee statistics.
        </p>
      )}

      {stats && (
        counters.length === 0 ? (
          <p data-testid="hub-zigbee-stats-empty" className="text-sm text-grouse italic">
            The hub reported no Zigbee statistics.
          </p>
        ) : (
          <dl data-testid="hub-zigbee-stats" className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
            {counters.map(([name, value]) => (
              <div key={name} className="flex justify-between gap-2 border-b border-heron/50 py-1">
                <dt className="text-grouse">{name}</dt>
                <dd data-testid={`hub-zigbee-stat-${testIdSlug(name)}`} className="text-swift">{value}</dd>
              </div>
            ))}
          </dl>
        )
      )}
    </section>
  );
}
