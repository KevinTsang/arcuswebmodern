'use client';

import { useState, useCallback } from 'react';
import { Halo } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

/** halo:roomNames maps each halo:room value (e.g. "LIVING_ROOM") to its display name. */
type HaloRoomNames = Record<string, string>;

/**
 * The room a Halo announces in its voice alerts ("Smoke in the living room").
 * Options come from the device's own halo:roomNames.
 */
export default function HaloRoomConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const roomNames = (device?.[Halo.ATTR_ROOMNAMES] as HaloRoomNames | undefined) ?? {};
  const room = (device?.[Halo.ATTR_ROOM] as string | undefined) ?? '';
  const entries = Object.entries(roomNames);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSaving(true);
    try {
      await setAttribute(Halo.ATTR_ROOM, e.target.value);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to save the room' }));
    }
    setSaving(false);
  }, [setAttribute, dispatch]);

  return (
    <div>
      <label htmlFor={`halo-room-${address}`} className="block text-sm font-medium text-swift mb-2">Room</label>
      {entries.length === 0 ? (
        <p data-testid="halo-room-empty" className="text-sm text-grouse">No rooms are available for this device.</p>
      ) : (
        <select
          id={`halo-room-${address}`}
          value={room}
          onChange={handleChange}
          disabled={saving}
          data-testid="halo-room-select"
          className="w-full px-3 py-2 text-sm text-swift bg-crane border border-heron rounded-[var(--border-radius-base)] focus:outline-none focus:border-peacock disabled:opacity-50"
        >
          {!roomNames[room] && <option value={room} disabled>Select a room</option>}
          {entries.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
