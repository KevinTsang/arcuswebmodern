'use client';

import { useCallback, useEffect, useState } from 'react';
import Bridge from '@arcus/core/bridge';
import { MobileDevice, Person } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import InfoCard from './InfoCard';
import MobileDeviceRow from './MobileDeviceRow';
import type { ListMobileDevicesResponse, MobileDeviceData } from './mobileDevices';

interface MobileDevicesCardProps {
  /** Address of the person whose mobile devices are listed (e.g. `SERV:person:<id>`). */
  personAddress: string;
}

interface LoadedDevices {
  personAddress: string;
  devices: MobileDeviceData[];
  failed: boolean;
}

/**
 * Lists the phones and tablets signed in to the Arcus app as this person.
 * These devices receive push notifications and report the person's
 * home/away presence. Removing one disassociates it from the person.
 */
export default function MobileDevicesCard({ personAddress }: MobileDevicesCardProps) {
  const dispatch = useAppDispatch();
  const [loaded, setLoaded] = useState<LoadedDevices | null>(null);
  const [removingIndex, setRemovingIndex] = useState<number | null>(null);

  // Results for a previous person are stale: treat them as still loading.
  const current = loaded?.personAddress === personAddress ? loaded : null;
  const devices = current?.devices ?? null;
  const loadFailed = current?.failed ?? false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await Bridge.request<ListMobileDevicesResponse>(
          Person.CMD_LISTMOBILEDEVICES,
          personAddress,
          {},
        );
        if (!cancelled) setLoaded({ personAddress, devices: resp?.mobileDevices ?? [], failed: false });
      } catch {
        if (!cancelled) setLoaded({ personAddress, devices: [], failed: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personAddress]);

  const handleRemove = useCallback(
    async (device: MobileDeviceData) => {
      if (!window.confirm('Remove this mobile device? It will stop receiving notifications and reporting presence.')) {
        return;
      }
      const deviceIndex = device[MobileDevice.ATTR_DEVICEINDEX];
      setRemovingIndex(deviceIndex);
      try {
        await Bridge.request(Person.CMD_REMOVEMOBILEDEVICE, personAddress, { deviceIndex });
        setLoaded((prev) =>
          prev && {
            ...prev,
            devices: prev.devices.filter((d) => d[MobileDevice.ATTR_DEVICEINDEX] !== deviceIndex),
          },
        );
        dispatch(addNotification({ type: 'success', message: 'Mobile device removed.' }));
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to remove mobile device.' }));
      } finally {
        setRemovingIndex(null);
      }
    },
    [personAddress, dispatch],
  );

  return (
    <InfoCard title="Mobile Devices">
      <p className="text-xs text-grouse">
        Phones and tablets signed in to the Arcus app as you. They receive push notifications and
        report when you arrive home or leave.
      </p>
      {devices === null ? (
        <p data-testid="mobile-devices-loading" className="text-sm text-grouse">Loading…</p>
      ) : loadFailed ? (
        <p data-testid="mobile-devices-error" className="text-sm text-cardinal">
          Unable to load mobile devices.
        </p>
      ) : devices.length === 0 ? (
        <p data-testid="mobile-devices-empty" className="text-sm text-grouse">
          No mobile devices. Sign in to the Arcus app on your phone to use it for presence.
        </p>
      ) : (
        <ul className="divide-y divide-heron">
          {devices.map((device) => (
            <MobileDeviceRow
              key={device[MobileDevice.ATTR_DEVICEINDEX]}
              device={device}
              removing={removingIndex === device[MobileDevice.ATTR_DEVICEINDEX]}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
    </InfoCard>
  );
}
