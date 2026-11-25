import { useState, useEffect, useCallback, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import { Place } from '@arcus/core';
import type { HistoryEntry } from './HistoryList';
import type { ListHistoryEntriesResponse } from '@/arcus/types';

const PAGE_SIZE = 20;

export interface UseHistoryFetchOptions {
  /** The ListHistoryEntries command to send, e.g. `Device.CMD_LISTHISTORYENTRIES`. Defaults to the place's. */
  command?: string;
  /** Entries per page. Defaults to 20. */
  pageSize?: number;
  /** Fetch only once this is true (e.g. when a collapsed history is opened). Defaults to true. */
  enabled?: boolean;
  /** Called when a page fails to load. */
  onError?: () => void;
}

interface UseHistoryFetchResult {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  /** The first page has loaded. */
  loaded: boolean;
  /** The last request failed; `retry` repeats it. */
  failed: boolean;
  loadMore: () => void;
  refresh: () => void;
  retry: () => void;
}

export default function useHistoryFetch(address: string, options: UseHistoryFetchOptions = {}): UseHistoryFetchResult {
  const { command = Place.CMD_LISTHISTORYENTRIES, pageSize = PAGE_SIZE, enabled = true, onError } = options;
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const nextTokenRef = useRef<string | undefined>(undefined);
  // A ref, not state, so a second click before the re-render can't start a duplicate request.
  const loadingRef = useRef(false);
  const startedForRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPage = useCallback(
    async (token?: string, append = false) => {
      if (loadingRef.current || !address) return;
      loadingRef.current = true;
      setLoading(true);
      setFailed(false);
      try {
        const result = await Bridge.request<ListHistoryEntriesResponse>(command, address, {
          limit: pageSize,
          token,
        });
        if (!mountedRef.current) return;
        const newEntries = result?.results ?? [];
        const newToken = result?.nextToken || undefined;

        if (append) {
          setEntries((prev) => [...prev, ...newEntries]);
        } else {
          setEntries(newEntries);
        }
        nextTokenRef.current = newToken;
        setHasMore(newEntries.length > 0 && !!newToken);
        setLoaded(true);
      } catch {
        if (!mountedRef.current) return;
        setHasMore(false);
        setFailed(true);
        onErrorRef.current?.();
      } finally {
        loadingRef.current = false;
        if (mountedRef.current) setLoading(false);
      }
    },
    [address, command, pageSize],
  );

  // Start (again) when the address changes, once enabled.
  useEffect(() => {
    if (!address || !enabled || startedForRef.current === address) return;
    startedForRef.current = address;
    setEntries([]);
    setLoaded(false);
    nextTokenRef.current = undefined;
    setHasMore(true);
    fetchPage();
  }, [address, enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (!nextTokenRef.current || loadingRef.current) return;
    fetchPage(nextTokenRef.current, true);
  }, [fetchPage]);

  const refresh = useCallback(() => {
    setEntries([]);
    setLoaded(false);
    nextTokenRef.current = undefined;
    setHasMore(true);
    fetchPage();
  }, [fetchPage]);

  const retry = useCallback(() => {
    if (loaded && nextTokenRef.current) fetchPage(nextTokenRef.current, true);
    else fetchPage();
  }, [fetchPage, loaded]);

  return { entries, loading, hasMore, loaded, failed, loadMore, refresh, retry };
}
