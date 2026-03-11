import { useEffect, useRef } from 'react';

export interface HistoryEntry {
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

interface HistoryListProps {
  entries: HistoryEntry[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function HistoryList({
  entries,
  loading,
  hasMore,
  onLoadMore,
}: HistoryListProps) {
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
