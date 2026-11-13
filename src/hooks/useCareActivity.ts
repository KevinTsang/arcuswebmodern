/**
 * useCareActivity — pages through `subcare:ListDetailedActivity` for one day.
 *
 * The platform returns care device history newest first. As in the legacy
 * client, the first page starts at the end of the selected day (a timestamp
 * is a valid token) and paging stops once results reach the previous day.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CareSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { HistoryEntry } from '@/components/history';
import type { ListDetailedActivityResponse } from '@/arcus/types';

export const CARE_ACTIVITY_PAGE_SIZE = 20;
const DAY_MS = 24 * 60 * 60 * 1000;
const LOAD_ERROR = 'Failed to load care activity';

interface UseCareActivityResult {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

/** The loaded entries, tagged with the query they belong to. */
interface ActivityPage {
  key: string;
  entries: HistoryEntry[];
  hasMore: boolean;
}

const EMPTY_PAGE: ActivityPage = { key: '', entries: [], hasMore: false };

/** Keep the entries that fall on the day and note whether paging should continue. */
function toPage(key: string, result: ListDetailedActivityResponse, dayStart: number): ActivityPage {
  const dayEnd = dayStart + DAY_MS - 1;
  const results = result.results ?? [];
  const reachedPreviousDay = results.some((e) => e.timestamp < dayStart);
  return {
    key,
    entries: results.filter((e) => e.timestamp >= dayStart && e.timestamp <= dayEnd),
    hasMore: !!result.nextToken && results.length > 0 && !reachedPreviousDay,
  };
}

/**
 * @param address  Care subsystem address; nothing is fetched without one.
 * @param dayStart Local midnight (epoch ms) of the day to show.
 * @param device   Device address to filter by, or `undefined` for every care device.
 */
export function useCareActivity(address: string | undefined, dayStart: number, device?: string): UseCareActivityResult {
  const dispatch = useAppDispatch();
  const [refreshCount, setRefreshCount] = useState(0);
  const [page, setPage] = useState<ActivityPage>(EMPTY_PAGE);
  const [appending, setAppending] = useState(false);
  const nextTokenRef = useRef<string | undefined>(undefined);
  const keyRef = useRef('');

  const queryKey = address ? `${address}|${dayStart}|${device ?? ''}|${refreshCount}` : '';

  const request = useCallback((token: string | undefined) => {
    return Bridge.request<ListDetailedActivityResponse>(
      CareSubsystem.CMD_LISTDETAILEDACTIVITY,
      address ?? '',
      { limit: CARE_ACTIVITY_PAGE_SIZE, token, devices: device ? [device] : undefined },
    );
  }, [address, device]);

  // First page: reload whenever the query (or the refresh count) changes.
  useEffect(() => {
    keyRef.current = queryKey;
    nextTokenRef.current = undefined;
    if (!queryKey) return;
    let cancelled = false;
    request(String(dayStart + DAY_MS - 1)).then((result) => {
      if (cancelled) return;
      nextTokenRef.current = result.nextToken;
      setPage(toPage(queryKey, result, dayStart));
    }, () => {
      if (cancelled) return;
      setPage({ key: queryKey, entries: [], hasMore: false });
      dispatch(addNotification({ type: 'error', message: LOAD_ERROR }));
    });
    return () => { cancelled = true; };
  }, [queryKey, request, dayStart, dispatch]);

  const current = page.key === queryKey ? page : EMPTY_PAGE;
  const firstPageLoading = !!queryKey && page.key !== queryKey;

  const loadMore = useCallback(async () => {
    const token = nextTokenRef.current;
    if (!token || appending || firstPageLoading) return;
    const key = queryKey;
    setAppending(true);
    try {
      const result = await request(token);
      if (keyRef.current === key) {
        nextTokenRef.current = result.nextToken;
        const next = toPage(key, result, dayStart);
        setPage((prev) => (prev.key === key ? { ...next, entries: [...prev.entries, ...next.entries] } : prev));
      }
    } catch {
      if (keyRef.current === key) {
        setPage((prev) => (prev.key === key ? { ...prev, hasMore: false } : prev));
        dispatch(addNotification({ type: 'error', message: LOAD_ERROR }));
      }
    }
    setAppending(false);
  }, [appending, firstPageLoading, queryKey, request, dayStart, dispatch]);

  const refresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
  }, []);

  return {
    entries: current.entries,
    loading: firstPageLoading || appending,
    hasMore: current.hasMore,
    loadMore,
    refresh,
  };
}
