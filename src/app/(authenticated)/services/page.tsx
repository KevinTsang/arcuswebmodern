'use client';

/**
 * Services page — ported from src/pages/services/.
 *
 * Shows subsystem navigation sidebar with detail views for each
 * subsystem. Custom views for alarms, cameras, care, climate,
 * doors & locks, home & family, and lawn & garden. Generic
 * device list for lights & switches and water.
 */

import { useState, useCallback, useMemo } from 'react';
import { Place } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { subsystemConfigs, type SubsystemConfigEntry } from '@/lib/subsystemConfig';
import {
  AlarmsView,
  CamerasView,
  CareView,
  ClimateView,
  DoorsLocksView,
  HomeFamilyView,
  LawnGardenView,
  GenericDeviceListView,
} from '@/components/subsystem';

export default function ServicesPage() {
  const [activeSlug, setActiveSlug] = useState(subsystemConfigs[0]?.slug ?? 'alarms');
  const placeName = useAppSelector(
    (s) => s.place.place?.[Place.ATTR_NAME] ?? 'Your Home',
  );

  const activeConfig = useMemo(
    () => subsystemConfigs.find((c) => c.slug === activeSlug),
    [activeSlug],
  );

  return (
    <div className="p-[var(--gutter)]">
      {/* Context bar */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          Services
        </h2>
        <span className="text-sm text-grouse">{placeName}</span>
      </div>

      <div className="flex gap-6">
        {/* Subsystem sidebar */}
        <nav className="w-52 flex-shrink-0 hidden md:block">
          <ul className="space-y-0.5">
            {subsystemConfigs.filter((c) => c.visible).map((config) => (
              <li key={config.slug}>
                <button
                  onClick={() => setActiveSlug(config.slug)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-[var(--border-radius-base)] text-sm transition-colors flex items-center gap-2
                    ${activeSlug === config.slug
                      ? 'bg-peacock/10 text-peacock font-medium'
                      : 'text-coot hover:bg-pigeon'}
                  `}
                >
                  <span className={`${config.icon} text-base`} />
                  {config.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Mobile subsystem selector */}
        <div className="md:hidden mb-4 w-full">
          <select
            value={activeSlug}
            onChange={(e) => setActiveSlug(e.target.value)}
            className="w-full text-sm border border-heron rounded-[var(--border-radius-base)] px-3 py-2 focus:outline-none focus:border-peacock"
          >
            {subsystemConfigs.filter((c) => c.visible).map((config) => (
              <option key={config.slug} value={config.slug}>
                {config.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subsystem content */}
        <div className="flex-1 min-w-0">
          {activeConfig && (
            <>
              {/* Subsystem header */}
              <div className="flex items-center gap-2 mb-6">
                <span className={`${activeConfig.icon} text-xl text-peacock`} />
                <h3 className="text-lg font-semibold text-swift">{activeConfig.name}</h3>
              </div>

              {/* Subsystem view */}
              <SubsystemContent config={activeConfig} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SubsystemContent({ config }: { config: SubsystemConfigEntry }) {
  switch (config.slug) {
    case 'alarms':
      return <AlarmsView />;
    case 'cameras':
      return <CamerasView />;
    case 'care':
      return <CareView />;
    case 'climate':
      return <ClimateView />;
    case 'doors-locks':
      return <DoorsLocksView />;
    case 'home-family':
      return <HomeFamilyView />;
    case 'lawn-garden':
      return <LawnGardenView />;
    default:
      return <GenericDeviceListView config={config} />;
  }
}
