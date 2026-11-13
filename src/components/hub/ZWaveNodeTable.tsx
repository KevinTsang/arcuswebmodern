'use client';

/**
 * ZWaveNodeTable — per-node view of a hubzwave:NetworkInformation response:
 * each node's metrics (signal / transmit counters), neighbors, the route the
 * controller uses to reach it, and its routing table.
 *
 * The platform declares those maps as untyped objects keyed by node id, so
 * values are formatted generically.
 */

import { useMemo } from 'react';
import { formatPlatformJson } from './formatPlatformJson';
import type { ZWaveNetworkInformation } from './hubAdvancedTypes';

interface ZWaveNodeTableProps {
  info: ZWaveNetworkInformation;
}

function compareNodeIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
}

export function ZWaveNodeTable({ info }: ZWaveNodeTableProps) {
  const nodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const map of [info.metrics, info.neighbors, info.route, info.routing]) {
      if (map) Object.keys(map).forEach((id) => ids.add(id));
    }
    return [...ids].sort(compareNodeIds);
  }, [info]);

  if (nodeIds.length === 0) {
    return (
      <p data-testid="zwave-nodes-empty" className="text-sm text-grouse italic">
        The hub reported no Z-Wave nodes.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table data-testid="zwave-nodes" className="w-full text-xs text-left">
        <thead>
          <tr className="text-grouse border-b border-heron">
            <th className="py-2 pr-3 font-medium">Node</th>
            <th className="py-2 pr-3 font-medium">Metrics</th>
            <th className="py-2 pr-3 font-medium">Neighbors</th>
            <th className="py-2 pr-3 font-medium">Route</th>
            <th className="py-2 font-medium">Routing Table</th>
          </tr>
        </thead>
        <tbody>
          {nodeIds.map((id) => (
            <tr key={id} data-testid={`zwave-node-${id}`} className="border-b border-heron/50 align-top text-swift">
              <td className="py-2 pr-3 font-medium">{id}</td>
              <td data-testid={`zwave-node-${id}-metrics`} className="py-2 pr-3 break-words">{formatPlatformJson(info.metrics?.[id])}</td>
              <td data-testid={`zwave-node-${id}-neighbors`} className="py-2 pr-3 break-words">{formatPlatformJson(info.neighbors?.[id])}</td>
              <td data-testid={`zwave-node-${id}-route`} className="py-2 pr-3 break-words">{formatPlatformJson(info.route?.[id])}</td>
              <td data-testid={`zwave-node-${id}-routing`} className="py-2 break-words">{formatPlatformJson(info.routing?.[id])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
