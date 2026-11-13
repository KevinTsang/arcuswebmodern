'use client';

import { useCallback, useEffect, useState } from 'react';
import { MobileDevice, Person } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import InfoCard from './InfoCard';
import { MobileDeviceRow } from './MobileDeviceRow';
import type { ListMobileDevicesResponse, MobileDeviceData } from './types';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Lists the mobile devices that receive the person's push notifications
 * (`person:ListMobileDevices`) and removes one with `person:RemoveMobileDevice`,
 * like the legacy Profile → Push Notifications panel. Devices are added by
 * signing in on the mobile app, so there is no "add" here.
 */
export function PushNotificationsCard({ personId }: { personId: string }) {
  const dispatch = useAppDispatch();
  const [devices, setDevices] = useState<MobileDeviceData[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [removing, setRemoving] = useState<number | null>(null);
  const personAddress = `SERV:person:${personId}`;

  // Starts in 'loading' (and the section keys this card by person), so the
  // effect never sets state synchronously; only a retry resets it.
  const load = useCallback(() => {
    Bridge.request<ListMobileDevicesResponse>(Person.CMD_LISTMOBILEDEVICES, personAddress, {}).then(
      (res) => {
        setDevices(res?.mobileDevices ?? []);
        setState('ready');
      },
      () => {
        setState('error');
        dispatch(addNotification({ type: 'error', message: 'Failed to load push notification devices.' }));
      },
    );
  }, [personAddress, dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = useCallback(() => {
    setState('loading');
    load();
  }, [load]);

  const handleRemove = useCallback(async (deviceIndex: number) => {
    setRemoving(deviceIndex);
    try {
      await Bridge.request(Person.CMD_REMOVEMOBILEDEVICE, personAddress, { deviceIndex });
      setDevices((prev) => prev.filter((d) => d[MobileDevice.ATTR_DEVICEINDEX] !== deviceIndex));
      dispatch(addNotification({ type: 'success', message: 'Device removed from push notifications.' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to remove device.' }));
    } finally {
      setRemoving(null);
    }
  }, [personAddress, dispatch]);

  return (
    <InfoCard title="Push Notifications">
      <p className="text-xs text-grouse">
        These mobile devices receive your push notifications. Remove a device to stop sending notifications to it.
        Push notifications can only be sent to phones and tablets signed in to the mobile app.
      </p>
      {state === 'loading' && (
        <p data-testid="push-devices-loading" className="text-sm text-grouse">Loading devices…</p>
      )}
      {state === 'error' && (
        <div className="space-y-1">
          <p data-testid="push-devices-error" className="text-sm text-cardinal">Unable to load your devices.</p>
          <button data-testid="push-devices-retry" onClick={handleRetry}className="text-sm text-peacock hover:underline">
            Try again
          </button>
        </div>
      )}
      {state === 'ready' && devices.length === 0 && (
        <p data-testid="push-devices-empty" className="text-sm text-grouse">
          No mobile devices receive your push notifications.
        </p>
      )}
      {state === 'ready' && devices.length > 0 && (
        <ul data-testid="push-devices-list">
          {devices.map((device) => (
            <MobileDeviceRow
              key={device[MobileDevice.ATTR_DEVICEINDEX]}
              device={device}
              removing={removing === device[MobileDevice.ATTR_DEVICEINDEX]}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      )}
    </InfoCard>
  );
}
