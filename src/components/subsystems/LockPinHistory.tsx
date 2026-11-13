'use client';

/**
 * LockPinHistory — a lock's recent activity (PIN use, locking and
 * unlocking), from `dev:ListHistoryEntries` on the lock. Collapsed by
 * default; the first page loads when it is opened, more on request.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Device } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { ListHistoryEntriesResponse } from '@/arcus/types';
import type { HistoryEntry } from '@/components/history/HistoryList';

export const PIN_HISTORY_PAGE_SIZE = 10;

interface LockPinHistoryProps {
  lockAddress: string;
}

function formatWhen(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function LockPinHistory({ lockAddress }: LockPinHistoryProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPage = useCallback(async (token?: string) => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await Bridge.request<ListHistoryEntriesResponse>(
        Device.CMD_LISTHISTORYENTRIES, lockAddress, { limit: PIN_HISTORY_PAGE_SIZE, token },
      );
      if (!mountedRef.current) return;
      const results = res?.results ?? [];
      setEntries((prev) => (token ? [...prev, ...results] : results));
      setNextToken(res?.nextToken || undefined);
      setLoaded(true);
    } catch {
      if (!mountedRef.current) return;
      setFailed(true);
      dispatch(addNotification({ type: 'error', message: 'Failed to load lock history' }));
    }
    if (mountedRef.current) setLoading(false);
  }, [lockAddress, dispatch]);

  const handleToggleOpen = useCallback(() => {
    const opening = !open;
    setOpen(opening);
    if (opening && !loaded && !loading) fetchPage();
  }, [open, loaded, loading, fetchPage]);

  const handleLoadMore = useCallback(() => {
    if (nextToken && !loading) fetchPage(nextToken);
  }, [nextToken, loading, fetchPage]);

  const handleRetry = useCallback(() => {
    fetchPage(loaded ? nextToken : undefined);
  }, [fetchPage, loaded, nextToken]);

  return (
    <div className="mt-4 pt-3 border-t border-heron">
      <button
        type="button"
        onClick={handleToggleOpen}
        aria-expanded={open}
        data-testid={`lock-history-toggle-${lockAddress}`}
        className="text-sm text-peacock hover:underline"
      >
        {open ? 'Hide PIN history' : 'Show PIN history'}
      </button>

      {open && (
        <div data-testid={`lock-history-${lockAddress}`} className="mt-2">
          {entries.length > 0 && (
            <ul className="space-y-1.5">
              {entries.map((entry, i) => (
                <li key={`${entry.timestamp}-${i}`} className="flex gap-3 text-sm">
                  <span className="text-xs text-grouse w-28 flex-shrink-0 pt-0.5">{formatWhen(entry.timestamp)}</span>
                  <span className="text-swift">{entry.longMessage}</span>
                </li>
              ))}
            </ul>
          )}

          {loaded && !failed && entries.length === 0 && (
            <p data-testid={`lock-history-empty-${lockAddress}`} className="text-sm text-grouse">
              No activity recorded for this lock yet.
            </p>
          )}

          {loading && <p className="text-sm text-grouse">Loading…</p>}

          {failed && !loading && (
            <p className="text-sm text-grouse">
              Couldn&apos;t load the history.{' '}
              <button
                type="button"
                onClick={handleRetry}
                data-testid={`lock-history-retry-${lockAddress}`}
                className="text-peacock hover:underline"
              >
                Try again
              </button>
            </p>
          )}

          {nextToken && !loading && !failed && (
            <button
              type="button"
              onClick={handleLoadMore}
              data-testid={`lock-history-more-${lockAddress}`}
              className="mt-2 text-sm text-peacock hover:underline"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}
