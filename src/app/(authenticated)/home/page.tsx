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
import Bridge from '@arcus/core/bridge';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { selectAllScenes } from '@/store/slices/scenesSlice';
import { selectAllSubsystems } from '@/store/slices/subsystemsSlice';
import { selectAllIncidents } from '@/store/slices/incidentsSlice';
import {
  useAlarmSubsystem,
  useClimateSubsystem,
  useDoorsLocksSubsystem,
  useHomeFamilySubsystem,
  useCareSubsystem,
  useCamerasSubsystem,
  useLawnGardenSubsystem,
  useSubsystemDevices,
} from '@/hooks/useSubsystem';
import { cToF, formatTemp } from '@/hooks/useDeviceConfig';
import { DevicePanel } from '@/components/device';

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

const SERVICE_TO_SLUG: Record<string, string> = {
  ALARMS: 'alarms',
  CLIMATE: 'climate',
  DOORS_N_LOCKS: 'doors-locks',
  CAMERAS: 'cameras',
  CARE: 'care',
  HOME_N_FAMILY: 'home-family',
  LAWN_N_GARDEN: 'lawn-garden',
  LIGHTS_N_SWITCHES: 'lights-switches',
  WATER: 'water',
};

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

export default function HomePage() {
  const place = useAppSelector((s) => s.place.place);
  const preferences = useAppSelector((s) => s.place.preferences);
  const subsystems = useAppSelector(selectAllSubsystems);
  const placeId = useAppSelector((s) => s.place.placeId);

  const placeName = (place?.['place:name'] as string) ?? 'Your Home';

  const [showSidebar, setShowSidebar] = useState(true);
  const [events, setEvents] = useState<HistoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard history
  const fetchHistory = useCallback(async () => {
    if (!placeId) return;
    setRefreshing(true);
    try {
      const result = await Bridge.request(
        'place:ListDashboardEntries',
        `SERV:place:${placeId}`,
        { limit: 5 },
      );
      setEvents((result.results as HistoryEntry[]) ?? []);
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
        const addr = s['base:address'] as string;
        return addr?.startsWith(`SERV:${ns}:`) && s['subs:available'] !== false;
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

/* ── Card Wrapper ───────────────────────────────────────────────── */

function CardShell({
  title,
  icon,
  href,
  badge,
  children,
}: {
  title: string;
  icon: string;
  href?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  const header = (
    <div className="flex items-center gap-2">
      <span className={`${icon} text-base text-peacock`} />
      <span className="text-sm font-semibold text-swift">{title}</span>
      {badge}
    </div>
  );

  return (
    <div className="border border-heron rounded-[var(--border-radius-base)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-pigeon/20">
        {href ? (
          <Link href={href} className="hover:underline">
            {header}
          </Link>
        ) : (
          header
        )}
        {href && (
          <Link href={href} className="text-xs text-peacock hover:underline">
            View &rarr;
          </Link>
        )}
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}

/* ── Favorites Card ─────────────────────────────────────────────── */

function FavoritesCard() {
  const devices = useAppSelector(selectAllDevices);
  const scenes = useAppSelector(selectAllScenes);

  const favoriteDevices = useMemo(
    () => devices.filter((d) => d['isFavorite'] === true || d['dev:favorite'] === true),
    [devices],
  );

  const favoriteScenes = useMemo(
    () => scenes.filter((s) => s['scene:favorite'] === true),
    [scenes],
  );

  const count = favoriteDevices.length + favoriteScenes.length;

  return (
    <CardShell title="Favorites" icon="icon-app-heart-2">
      {count > 0 ? (
        <>
          <p className="text-xs text-grouse mb-3">{count} favorite{count !== 1 ? 's' : ''}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {favoriteDevices.map((device) => (
              <FavoriteDeviceChip key={device.id} device={device} />
            ))}
            {favoriteScenes.map((scene) => (
              <FavoriteSceneChip key={scene.id} scene={scene} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-grouse">
          Mark devices and scenes as favorites to see them here.
        </p>
      )}
    </CardShell>
  );
}

function FavoriteDeviceChip({ device }: { device: Record<string, unknown> }) {
  const name = (device['dev:name'] as string) ?? 'Device';
  return (
    <div className="flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)]">
      <div className="w-10 h-10 bg-pigeon/50 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-devices text-sm text-grouse" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </div>
  );
}

function FavoriteSceneChip({ scene }: { scene: Record<string, unknown> }) {
  const name = (scene['scene:name'] as string) ?? 'Scene';
  return (
    <div className="flex-shrink-0 w-28 text-center p-2 border border-heron rounded-[var(--border-radius-base)]">
      <div className="w-10 h-10 bg-peacock/10 rounded-full flex items-center justify-center mx-auto mb-1">
        <span className="icon-app-scene text-sm text-peacock" />
      </div>
      <p className="text-xs text-swift truncate">{name}</p>
    </div>
  );
}

/* ── Alarms Card ────────────────────────────────────────────────── */

function AlarmsCard() {
  const alarm = useAlarmSubsystem();
  const incidents = useAppSelector(selectAllIncidents);
  const place = useAppSelector((s) => s.place.place);
  const isPromon = (place?.['place:serviceLevel'] as string)?.includes('PROMON');

  const activeIncident = incidents.find(
    (i) => i['incident:alertState'] === 'ALERT',
  );

  return (
    <CardShell
      title="Alarms"
      icon="icon-app-alarm-1"
      href="/services"
      badge={isPromon ? (
        <span className="text-[10px] bg-peacock/10 text-peacock rounded-full px-2 py-0.5 font-medium">
          Pro
        </span>
      ) : undefined}
    >
      {activeIncident ? (
        <div className="bg-cardinal/5 border border-cardinal/20 rounded p-3">
          <p className="text-sm font-medium text-cardinal">Alarm Active</p>
          <p className="text-xs text-grouse mt-0.5">
            {String(activeIncident['incident:alert'] ?? 'Security alert in progress')}
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          <StatusBadge
            label="Security"
            value={alarm.securityMode === 'OFF' ? 'Disarmed' : alarm.securityMode}
            color={alarm.securityMode === 'OFF' ? 'text-grouse' : 'text-honeycreeper'}
          />
          <StatusBadge
            label="Devices"
            value={`${alarm.offlineDevices.length} offline`}
            color={alarm.offlineDevices.length > 0 ? 'text-canary' : 'text-grouse'}
          />
        </div>
      )}
    </CardShell>
  );
}

/* ── Climate Card ───────────────────────────────────────────────── */

function ClimateCard() {
  const climate = useClimateSubsystem();

  return (
    <CardShell title="Climate" icon="icon-app-thermometer" href="/services">
      <div className="flex gap-6">
        {climate.temperature != null && (
          <div>
            <p className="text-2xl font-light text-swift">{formatTemp(climate.temperature)}</p>
            <p className="text-xs text-grouse">Temperature</p>
          </div>
        )}
        {climate.humidity != null && (
          <div>
            <p className="text-2xl font-light text-swift">{Math.round(climate.humidity as number)}%</p>
            <p className="text-xs text-grouse">Humidity</p>
          </div>
        )}
        {climate.temperature == null && climate.humidity == null && (
          <p className="text-sm text-grouse">No climate data available.</p>
        )}
      </div>
    </CardShell>
  );
}

/* ── Doors & Locks Card ─────────────────────────────────────────── */

function DoorsLocksCard() {
  const dl = useDoorsLocksSubsystem();
  const unlockedCount = dl.unlockedCount;
  const openCount = dl.openCount;

  return (
    <CardShell title="Doors & Locks" icon="icon-app-lock-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Unlocked"
          value={String(unlockedCount)}
          color={unlockedCount > 0 ? 'text-canary' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Open"
          value={String(openCount)}
          color={openCount > 0 ? 'text-canary' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Total"
          value={String(dl.locks.length + dl.contacts.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Cameras Card ───────────────────────────────────────────────── */

function CamerasCard() {
  const cameras = useCamerasSubsystem();

  return (
    <CardShell title="Cameras" icon="icon-app-camera-1" href="/services">
      <p className="text-sm text-grouse">
        {cameras.cameras.length} camera{cameras.cameras.length !== 1 ? 's' : ''}
      </p>
    </CardShell>
  );
}

/* ── Care Card ──────────────────────────────────────────────────── */

function CareCard() {
  const care = useCareSubsystem();

  return (
    <CardShell title="Care" icon="icon-app-heart-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Status"
          value={care.alarmState === 'ALERT' ? 'Alert' : 'OK'}
          color={care.alarmState === 'ALERT' ? 'text-cardinal' : 'text-honeycreeper'}
        />
        <StatusBadge
          label="Behaviors"
          value={String(care.behaviors.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Home & Family Card ─────────────────────────────────────────── */

function HomeFamilyCard() {
  const hf = useHomeFamilySubsystem();

  return (
    <CardShell title="Home & Family" icon="icon-app-people" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Home"
          value={String(hf.peopleAtHome.length)}
          color="text-honeycreeper"
        />
        <StatusBadge
          label="Away"
          value={String(hf.peopleAway.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Lawn & Garden Card ─────────────────────────────────────────── */

function LawnGardenCard() {
  const lg = useLawnGardenSubsystem();

  return (
    <CardShell title="Lawn & Garden" icon="icon-app-water-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Watering"
          value={String(lg.zonesWatering.length)}
          color={lg.zonesWatering.length > 0 ? 'text-peacock' : 'text-grouse'}
        />
        <StatusBadge
          label="Controllers"
          value={String(lg.controllers.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Lights & Switches Card ─────────────────────────────────────── */

function LightsSwitchesCard() {
  const lightDevices = useSubsystemDevices('sublightsnswitches', ['swit:state']);

  const onCount = lightDevices.filter(
    (d) => d['swit:state'] === 'ON',
  ).length;

  return (
    <CardShell title="Lights & Switches" icon="icon-app-light-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="On"
          value={String(onCount)}
          color={onCount > 0 ? 'text-canary' : 'text-grouse'}
        />
        <StatusBadge
          label="Total"
          value={String(lightDevices.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Water Card ─────────────────────────────────────────────────── */

function WaterCard() {
  const waterDevices = useSubsystemDevices('subwater', ['waterval:valvestate']);

  const closedCount = waterDevices.filter(
    (d) => d['waterval:valvestate'] === 'CLOSED',
  ).length;

  return (
    <CardShell title="Water" icon="icon-app-water-1" href="/services">
      <div className="flex gap-4">
        <StatusBadge
          label="Valves Closed"
          value={String(closedCount)}
          color="text-grouse"
        />
        <StatusBadge
          label="Devices"
          value={String(waterDevices.length)}
          color="text-grouse"
        />
      </div>
    </CardShell>
  );
}

/* ── Shared ─────────────────────────────────────────────────────── */

function StatusBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div>
      <p className={`text-lg font-light ${color}`}>{value}</p>
      <p className="text-xs text-grouse">{label}</p>
    </div>
  );
}
