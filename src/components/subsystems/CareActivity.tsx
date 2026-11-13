'use client';

/**
 * CareActivity — timeline of care device activity for a chosen day,
 * optionally filtered to one care device.
 *
 * Replaces legacy src/components/subsystem/care/activity/. Days go back two
 * weeks, the history the platform keeps for premium places (care is a
 * premium service).
 */

import { useMemo, useState, useCallback } from 'react';
import { Base, Device } from '@arcus/core';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useCareActivity } from '@/hooks/useCareActivity';
import { useAppSelector } from '@/store/hooks';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { HistoryList } from '@/components/history';

export const CARE_ACTIVITY_DAYS = 14;

function startOfDay(daysAgo: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.getTime();
}

function dayLabel(daysAgo: number, ts: number): string {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function CareActivity() {
  const care = useCareSubsystem();
  const allDevices = useAppSelector(selectAllDevices);
  const days = useMemo(
    () => Array.from({ length: CARE_ACTIVITY_DAYS }, (_, daysAgo) => {
      const ts = startOfDay(daysAgo);
      return { daysAgo, start: ts, label: dayLabel(daysAgo, ts) };
    }),
    [],
  );
  const [daysAgo, setDaysAgo] = useState(0);
  const dayStart = days[daysAgo].start;
  const [device, setDevice] = useState('');

  const careDeviceEntities = useMemo(
    () => allDevices.filter((d) => care.careDevices.includes(d[Base.ATTR_ADDRESS])),
    [allDevices, care.careDevices],
  );
  // Drop a device filter whose device has since left the care device list.
  const activeDevice = careDeviceEntities.some((d) => d[Base.ATTR_ADDRESS] === device) ? device : '';

  // With no care devices there is nothing to list, so skip the request.
  const address = care.careDevices.length > 0 ? care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined : undefined;
  const { entries, loading, hasMore, loadMore, refresh } = useCareActivity(address, dayStart, activeDevice || undefined);

  const handleDayChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDaysAgo(Number(e.target.value));
  }, []);

  const handleDeviceChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setDevice(e.target.value);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs text-grouse">
          <span className="block mb-1">Show activity from</span>
          <select
            data-testid="care-activity-day"
            value={daysAgo}
            onChange={handleDayChange}
            className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift"
          >
            {days.map((d) => <option key={d.daysAgo} value={d.daysAgo}>{d.label}</option>)}
          </select>
        </label>
        <label className="text-xs text-grouse">
          <span className="block mb-1">Device</span>
          <select
            data-testid="care-activity-device"
            value={activeDevice}
            onChange={handleDeviceChange}
            className="text-sm border border-heron rounded px-2 py-1 bg-crane text-swift"
          >
            <option value="">All care devices</option>
            {careDeviceEntities.map((d) => (
              <option key={d[Base.ATTR_ADDRESS]} value={d[Base.ATTR_ADDRESS]}>
                {(d[Device.ATTR_NAME] as string) ?? 'Unknown device'}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={refresh}
          data-testid="care-activity-refresh"
          className="ml-auto text-sm text-peacock hover:opacity-80"
        >
          Refresh
        </button>
      </div>

      {care.careDevices.length === 0 ? (
        <p data-testid="care-activity-no-devices" className="text-sm text-grouse py-8 text-center">
          No care devices selected. Choose devices on the Devices tab to see their activity.
        </p>
      ) : (
        <HistoryList entries={entries} loading={loading} hasMore={hasMore} onLoadMore={loadMore} />
      )}
    </div>
  );
}
