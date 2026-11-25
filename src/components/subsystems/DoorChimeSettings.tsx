'use client';

/**
 * DoorChimeSettings — the Doors & Locks "More" tab: whether the hub (and
 * keypad) chimes when each door contact sensor opens. The platform lists only
 * contact sensors marked as doors in `subdoorsnlocks:chimeConfig`; window
 * sensors, locks and motion sensors are never in it.
 *
 * Replaces src/components/subsystem/doors-locks/settings/. Writes the whole
 * `subdoorsnlocks:chimeConfig` set back with one entry flipped, as the
 * legacy client did.
 *
 * Toggles apply to a local copy straight away, so a quick second toggle builds
 * on the first even before the platform's value change reaches the store. The
 * copy follows the store and is restored from it when a save fails. Switches
 * are disabled while a save is in flight.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Base, Device, DoorsNLocksSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import { chimeConfigValue } from '@/lib/doorsLocks';
import type { ChimeConfig, DoorChimeEntry } from '@/store/entityTypes';
import { DoorChimeRow } from './DoorChimeRow';

interface ChimeRow {
  entry: DoorChimeEntry;
  name: string;
}

export function DoorChimeSettings() {
  const dispatch = useAppDispatch();
  const { subsystem, chimeConfig: storedConfig } = useDoorsLocksSubsystem();
  const devices = useAppSelector(selectAllDevices);
  const [saving, setSaving] = useState(false);

  const [chimeConfig, setChimeConfig] = useState<ChimeConfig>(storedConfig);
  const [syncedConfig, setSyncedConfig] = useState<ChimeConfig>(storedConfig);
  // Take the store's config whenever it changes (a saved toggle, or a change made elsewhere).
  if (storedConfig !== syncedConfig) {
    setSyncedConfig(storedConfig);
    setChimeConfig(storedConfig);
  }
  const latestStored = useRef(storedConfig);
  useEffect(() => {
    latestStored.current = storedConfig;
  }, [storedConfig]);

  const subsystemAddress = subsystem?.[Base.ATTR_ADDRESS];

  const namesByAddress = useMemo(() => {
    const names = new Map<string, string>();
    for (const d of devices) names.set(d[Base.ATTR_ADDRESS], (d[Device.ATTR_NAME] as string | undefined) ?? 'Unknown device');
    return names;
  }, [devices]);

  const rows = useMemo<ChimeRow[]>(() => chimeConfig
    .map((entry) => ({ entry, name: namesByAddress.get(entry.device) ?? 'Unknown device' }))
    .sort((a, b) => a.name.localeCompare(b.name)), [chimeConfig, namesByAddress]);

  const handleToggle = useCallback(async (deviceAddress: string) => {
    if (!subsystemAddress || saving) return;
    const updated = chimeConfig.map((c) => (c.device === deviceAddress ? { ...c, enabled: !c.enabled } : c));
    setChimeConfig(updated);
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, subsystemAddress, {
        [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: chimeConfigValue(updated),
      });
    } catch {
      setChimeConfig(latestStored.current);
      dispatch(addNotification({ type: 'error', message: 'Failed to update door chime' }));
    }
    setSaving(false);
  }, [subsystemAddress, saving, chimeConfig, dispatch]);

  if (!subsystemAddress || rows.length === 0) {
    return (
      <div data-testid="door-chime-empty" className="text-center py-8">
        <h3 className="text-base font-medium text-swift">Do More With Your Doors</h3>
        <p className="text-sm text-grouse mt-1">
          Add contact sensors to your doors to have the hub and keypad chime when doors are opened.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="door-chime-settings">
      <h3 className="text-base font-medium text-swift">Chime Hub</h3>
      <p className="text-xs text-grouse mt-0.5 mb-2">
        Chime the hub when a door contact sensor is opened.
      </p>
      {rows.map(({ entry, name }) => (
        <DoorChimeRow key={entry.device} entry={entry} name={name} disabled={saving} onToggle={handleToggle} />
      ))}
    </div>
  );
}
