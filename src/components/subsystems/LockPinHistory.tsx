'use client';

/**
 * LockPinHistory — a lock's recent activity (PIN use, locking and
 * unlocking), from `dev:ListHistoryEntries` on the lock. Collapsed by
 * default; the first page loads when it is opened, more on request.
 */

import { useState, useCallback } from 'react';
import { Device } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import useHistoryFetch from '@/components/history/useHistoryFetch';
import { formatShortDateTime } from '@/lib/dateTime';

export const PIN_HISTORY_PAGE_SIZE = 10;

interface LockPinHistoryProps {
  lockAddress: string;
}

export function LockPinHistory({ lockAddress }: LockPinHistoryProps) {
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);

  const handleError = useCallback(() => {
    dispatch(addNotification({ type: 'error', message: 'Failed to load lock history' }));
  }, [dispatch]);

  // The first page loads when the history is first opened; it stays loaded if it's closed again.
  const { entries, loading, loaded, failed, hasMore, loadMore, retry } = useHistoryFetch(lockAddress, {
    command: Device.CMD_LISTHISTORYENTRIES,
    pageSize: PIN_HISTORY_PAGE_SIZE,
    enabled: open,
    onError: handleError,
  });

  const handleToggleOpen = useCallback(() => setOpen((o) => !o), []);

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
                  <span className="text-xs text-grouse w-28 flex-shrink-0 pt-0.5">{formatShortDateTime(entry.timestamp)}</span>
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
                onClick={retry}
                data-testid={`lock-history-retry-${lockAddress}`}
                className="text-peacock hover:underline"
              >
                Try again
              </button>
            </p>
          )}

          {hasMore && loaded && !loading && !failed && (
            <button
              type="button"
              onClick={loadMore}
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
