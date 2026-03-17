import { useState, useEffect, useCallback, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import type { HistoryEntry } from './HistoryList';
import type { ListHistoryEntriesResponse } from '@/arcus/types';

const PAGE_SIZE = 20;

interface UseHistoryFetchResult {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export default function useHistoryFetch(address: string): UseHistoryFetchResult {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const nextTokenRef = useRef<string | undefined>(undefined);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(
    async (token?: string, append = false) => {
      if (loadingRef.current || !address) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const result = await Bridge.request<ListHistoryEntriesResponse>(Place.CMD_LISTHISTORYENTRIES, address, {
          limit: PAGE_SIZE,
          token,
        });
        const newEntries = result.results ?? [];
        const newToken = result.nextToken;

        if (append) {
          setEntries((prev) => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        nextTokenRef.current = newToken;
        setHasMore(newEntries.length > 0 && !!newToken);
      } catch {
        setHasMore(false);
      }
      loadingRef.current = false;
      setLoading(false);
    },
    [address],
  );

  // Reset and fetch when address changes
  useEffect(() => {
    if (!address) return;
    setEntries([]);
    nextTokenRef.current = undefined;
    setHasMore(true);
    fetchPage();
  }, [address, fetchPage]);

  const loadMore = useCallback(() => {
    if (!nextTokenRef.current || loadingRef.current) return;
    fetchPage(nextTokenRef.current, true);
  }, [fetchPage]);

  const refresh = useCallback(() => {
    setEntries([]);
    nextTokenRef.current = undefined;
    setHasMore(true);
    fetchPage();
  }, [fetchPage]);

  return { entries, loading, hasMore, loadMore, refresh };
}
