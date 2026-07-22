'use client';

/**
 * Home Dashboard — ported from src/pages/home/.
 *
 * Aggregates data from all subsystems into ordered cards.
 * Shows favorites, alarm status, climate, doors/locks, cameras,
 * care, home/family, lawn/garden, lights, and water.
 * Card ordering follows user preferences (dashboardCards).
 * Sidebar shows recent history events.
 */

import { useMemo, useCallback, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Bridge from '@arcus/core/bridge';
import { Base, Place, Subsystem } from '@arcus/core';
import type { ListHistoryEntriesResponse } from '@/arcus/types';
import type { HistoryEntry } from '@/components/history/HistoryList';
import { useAppSelector } from '@/store/hooks';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import {
  FavoritesCard,
  AlarmsCard,
  ClimateCard,
  DoorsLocksCard,
  CamerasCard,
  CareCard,
  HomeFamilyCard,
  LawnGardenCard,
  LightsSwitchesCard,
  WaterCard,
} from '@/components/home';

interface DashboardCard {
  serviceName: string;
  hideCard: boolean;
}

const DEFAULT_CARDS: DashboardCard[] = [
  { serviceName: 'FAVORITES', hideCard: false },
  { serviceName: 'ALARMS', hideCard: false },
  { serviceName: 'CLIMATE', hideCard: false },
  { serviceName: 'DOORS_N_LOCKS', hideCard: false },
  { serviceName: 'CAMERAS', hideCard: false },
  { serviceName: 'CARE', hideCard: false },
  { serviceName: 'HOME_N_FAMILY', hideCard: false },
  { serviceName: 'LAWN_N_GARDEN', hideCard: false },
  { serviceName: 'LIGHTS_N_SWITCHES', hideCard: false },
  { serviceName: 'WATER', hideCard: false },
];

const SERVICE_TO_NAMESPACE: Record<string, string> = {
  ALARMS: 'subalarm',
  CLIMATE: 'subclimate',
  DOORS_N_LOCKS: 'subdoorsnlocks',
  CAMERAS: 'subcameras',
  CARE: 'subcare',
  HOME_N_FAMILY: 'subpresence',
  LAWN_N_GARDEN: 'sublawnngarden',
  LIGHTS_N_SWITCHES: 'sublightsnswitches',
  WATER: 'subwater',
};


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

export default function HomePage() {
  const place = useAppSelector((s) => s.place.place);
  const preferences = useAppSelector((s) => s.place.preferences);
  const subsystems = useAppSelector(selectAllSubsystems);
  const placeId = useAppSelector((s) => s.place.placeId);

  const placeName = place?.[Place.ATTR_NAME] ?? 'Your Home';

  const [showSidebar, setShowSidebar] = useState(true);
  const [events, setEvents] = useState<HistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard history
  const fetchHistory = useCallback(async () => {
    if (!placeId) return;
    setRefreshing(true);
    try {
      const result = await Bridge.request<ListHistoryEntriesResponse>(
        Place.CMD_LISTDASHBOARDENTRIES,
        `SERV:place:${placeId}`,
        { limit: 5 },
      );
      setEvents(result.results ?? []);
    } catch {
      // silently fail
    }
    setRefreshing(false);
  }, [placeId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Card ordering from preferences
  const cards = useMemo(() => {
    const prefCards = (preferences?.['dashboardCards'] as DashboardCard[]) ?? DEFAULT_CARDS;
    return prefCards.filter((c) => !c.hideCard);
  }, [preferences]);

  // Check subsystem availability
  const isAvailable = useCallback(
    (serviceName: string) => {
      const ns = SERVICE_TO_NAMESPACE[serviceName];
      if (!ns) return serviceName === 'FAVORITES';
      return subsystems.some((s) => {
        const addr = s[Base.ATTR_ADDRESS] as string;
        return addr?.startsWith(`SERV:${ns}:`) && s[Subsystem.ATTR_AVAILABLE] !== false;
      });
    },
    [subsystems],
  );

  // Group history events by date
  const historyItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    let lastDate = '';
    for (let i = 0; i < events.length; i++) {
      const entry = events[i];
      const date = formatDate(entry.timestamp);
      if (date !== lastDate) {
        lastDate = date;
        items.push(
          <div key={`date-${i}`} className="text-center py-2">
            <small className="text-xs text-grouse border-b border-t border-heron px-3 py-1">
              {date}
            </small>
          </div>,
        );
      }
      items.push(
        <div key={i} className="flex gap-3 py-2">
          <span className="text-xs text-swift font-semibold w-[90px] flex-shrink-0 text-right uppercase pt-0.5">
            {formatTime(entry.timestamp)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-swift">{entry.subjectName}</p>
            <p className="text-xs text-grouse mt-0.5">{entry.longMessage}</p>
          </div>
        </div>,
      );
    }
    return items;
  }, [events]);

  return (
    <div className="flex flex-col-reverse md:flex-row">
      {/* History Sidebar */}
      {showSidebar && (
        <div className="bg-pigeon md:border-r border-heron w-full md:max-w-[350px] flex-shrink-0 overflow-hidden">
          <Image src="/default-home.jpg" width={350} height={240} alt={placeName} />
          <div className="flex justify-center items-center py-4 mx-[var(--gutter)] border-b border-heron">
            <h2 className="text-[length:var(--font-size-h3)] font-[var(--heading-font-weight)] text-swift text-center">
              <span className="icon-app-location-2 mr-2" />
              {placeName}
            </h2>
          </div>

          <div className="flex justify-center items-center gap-2 pt-4 pb-2">
            <h2 className="text-[length:var(--font-size-h4)] font-[var(--heading-font-weight)] text-swift">
              History
            </h2>
            <button
              onClick={fetchHistory}
              className="text-peacock hover:opacity-75 transition-opacity"
              title="Refresh history"
            >
              <span className={`icon-app-refresh text-sm ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="px-[var(--gutter)] pb-2">
            {events.length === 0 ? (
              <p className="text-sm text-grouse py-4 text-center">No recent activity.</p>
            ) : (
              historyItems
            )}
          </div>

          <div className="flex justify-center py-4">
            <Link
              href="/history"
              data-testid="history-more-link"
              className="bg-peacock text-crane px-6 py-2 rounded-[var(--border-radius-base)] hover:opacity-90 transition-opacity text-sm"
            >
              More
            </Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Context bar with sidebar toggle */}
        <div className="hidden md:flex items-center px-[var(--gutter)] pt-4 pb-2">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="text-peacock hover:opacity-75 transition-opacity"
            title={showSidebar ? 'Hide sidebar' : 'Show sidebar'}
          >
            <span className={showSidebar ? 'icon-app-sidebar-2 text-lg' : 'icon-app-sidebar-1 text-lg'} />
          </button>
        </div>

        <div className="p-[var(--gutter)]">
          {/* Dashboard cards */}
          <div className="space-y-4">
            {cards.map((card) => {
              if (!isAvailable(card.serviceName) && card.serviceName !== 'FAVORITES') {
                return null;
              }
              return (
                <DashboardCardRenderer key={card.serviceName} serviceName={card.serviceName} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardCardRenderer({ serviceName }: { serviceName: string }) {
  switch (serviceName) {
    case 'FAVORITES':
      return <FavoritesCard />;
    case 'ALARMS':
      return <AlarmsCard />;
    case 'CLIMATE':
      return <ClimateCard />;
    case 'DOORS_N_LOCKS':
      return <DoorsLocksCard />;
    case 'CAMERAS':
      return <CamerasCard />;
    case 'CARE':
      return <CareCard />;
    case 'HOME_N_FAMILY':
      return <HomeFamilyCard />;
    case 'LAWN_N_GARDEN':
      return <LawnGardenCard />;
    case 'LIGHTS_N_SWITCHES':
      return <LightsSwitchesCard />;
    case 'WATER':
      return <WaterCard />;
    default:
      return null;
  }
}
