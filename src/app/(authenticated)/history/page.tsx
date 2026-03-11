'use client';

/**
 * History page — ported from src/pages/history/.
 *
 * Shows place activity log with filtering by device.
 * Uses Bridge.request to fetch history entries from the place.
 */

import { useState, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { HistoryList, useHistoryFetch } from '@/components/history';

type FilterMode = 'all' | 'device';

export default function HistoryPage() {
  const placeId = useAppSelector((s) => s.place.placeId);
  const place = useAppSelector((s) => s.place.place);
  const devices = useAppSelector(selectAllDevices);

  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedDevice, setSelectedDevice] = useState('');

  const placeAddress = placeId ? `SERV:place:${placeId}` : '';
  const isPremium = place?.['place:serviceLevel'] === 'PREMIUM';

  const fetchAddress = useMemo(() => {
    if (filterMode === 'device' && selectedDevice) {
      const device = devices.find((d) => d['base:id'] === selectedDevice);
      if (device) return device['base:address'] as string;
    }
    return placeAddress;
  }, [filterMode, selectedDevice, devices, placeAddress]);

  const { entries, loading, hasMore, loadMore, refresh } = useHistoryFetch(fetchAddress);

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          History
        </h2>
        <button
          onClick={refresh}
          className="text-peacock hover:text-bluejay transition-colors text-sm"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <div className="w-48 flex-shrink-0 hidden md:block">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => {
                  setFilterMode('all');
                  setSelectedDevice('');
                }}
                className={`
                  w-full text-left px-3 py-2 rounded text-sm transition-colors
                  ${filterMode === 'all' ? 'bg-peacock/10 text-peacock font-medium' : 'text-coot hover:bg-pigeon'}
                `}
              >
                Show All History
              </button>
            </li>
            {devices.length > 0 && (
              <li>
                <div className="px-3 py-2">
                  <label className="block text-sm font-medium text-swift mb-1">By Device</label>
                  <select
                    value={selectedDevice}
                    onChange={(e) => {
                      setSelectedDevice(e.target.value);
                      if (e.target.value) setFilterMode('device');
                    }}
                    className="w-full text-sm border border-grouse rounded px-2 py-1.5 focus:outline-none focus:border-peacock"
                  >
                    <option value="">Choose a Device</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d['base:id'] as string}>
                        {(d['dev:name'] as string) ?? 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            )}
          </ul>
          {!isPremium && (
            <p className="text-xs text-grouse mt-4 px-3">
              Showing last 24 hours. Upgrade to Premium for 14 days of history.
            </p>
          )}
        </div>

        {/* Event listing */}
        <div className="flex-1 min-w-0">
          <HistoryList
            entries={entries}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={loadMore}
          />
        </div>
      </div>
    </div>
  );
}
