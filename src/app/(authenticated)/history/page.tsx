'use client';

/**
 * History page — ported from src/pages/history/.
 *
 * Shows place activity log with filtering by device.
 * Uses Bridge.request to fetch history entries from the place.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';

interface HistoryEntry {
  timestamp: number;
  subjectName: string;
  longMessage: string;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ── History List ──────────────────────────────────────────────────────

function HistoryList({
  entries,
  loading,
  hasMore,
  onLoadMore,
}: {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  if (entries.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-grouse">No recent activity.</p>
      </div>
    );
  }

  // Group entries by date
  let lastDate = '';
  const items: React.ReactNode[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const date = formatDate(entry.timestamp);

    if (date !== lastDate) {
      lastDate = date;
      if (i > 0) {
        items.push(<div key={`spacer-${i}`} className="h-4" />);
      }
      items.push(
        <h3 key={`date-${i}`} className="text-sm font-semibold text-swift mb-2">
          {date}
        </h3>,
      );
    }

    items.push(
      <div key={i} className="flex gap-3 py-2 border-b border-pigeon">
        <span className="text-xs text-grouse w-16 flex-shrink-0 pt-0.5">
          {formatTime(entry.timestamp)}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-swift">{entry.subjectName}</p>
          <p className="text-xs text-grouse mt-0.5">{entry.longMessage}</p>
        </div>
      </div>,
    );
  }

  return (
    <div>
      {items}
      {hasMore && <div ref={sentinelRef} className="h-8" />}
      {loading && (
        <div className="text-center py-4">
          <p className="text-sm text-grouse">Loading more...</p>
        </div>
      )}
    </div>
  );
}

// ── Page Component ────────────────────────────────────────────────────

type FilterMode = 'all' | 'device';

export default function HistoryPage() {
  const placeId = useAppSelector((s) => s.place.placeId);
  const place = useAppSelector((s) => s.place.place);
  const devices = useAppSelector(selectAllDevices);

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedDevice, setSelectedDevice] = useState('');

  const placeAddress = placeId ? `SERV:place:${placeId}` : '';
  const isPremium = place?.['place:serviceLevel'] === 'PREMIUM';

  const fetchHistory = useCallback(
    async (address: string, token?: string, append = false) => {
      if (loading) return;
      setLoading(true);
      try {
        const result = await Bridge.request('place:ListHistoryEntries', address, {
          limit: 20,
          token,
        });
        const newEntries = (result.results as HistoryEntry[]) ?? [];
        const newToken = result.nextToken as string | undefined;

        if (append) {
          setEntries((prev) => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        setNextToken(newToken);
        setHasMore(newEntries.length > 0 && !!newToken);
      } catch {
        setHasMore(false);
      }
      setLoading(false);
    },
    [loading],
  );

  // Initial fetch
  useEffect(() => {
    if (!placeAddress) return;
    setEntries([]);
    setNextToken(undefined);
    setHasMore(true);

    if (filterMode === 'device' && selectedDevice) {
      const device = devices.find((d) => d['base:id'] === selectedDevice);
      if (device) {
        fetchHistory(device['base:address'] as string);
        return;
      }
    }
    fetchHistory(placeAddress);
  }, [placeAddress, filterMode, selectedDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = useCallback(() => {
    if (!nextToken || loading) return;
    const address =
      filterMode === 'device' && selectedDevice
        ? (devices.find((d) => d['base:id'] === selectedDevice)?.['base:address'] as string) ?? placeAddress
        : placeAddress;
    fetchHistory(address, nextToken, true);
  }, [nextToken, loading, filterMode, selectedDevice, devices, placeAddress, fetchHistory]);

  const handleRefresh = useCallback(() => {
    setEntries([]);
    setNextToken(undefined);
    setHasMore(true);
    const address =
      filterMode === 'device' && selectedDevice
        ? (devices.find((d) => d['base:id'] === selectedDevice)?.['base:address'] as string) ?? placeAddress
        : placeAddress;
    fetchHistory(address);
  }, [filterMode, selectedDevice, devices, placeAddress, fetchHistory]);

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          History
        </h2>
        <button
          onClick={handleRefresh}
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
            onLoadMore={handleLoadMore}
          />
        </div>
      </div>
    </div>
  );
}
