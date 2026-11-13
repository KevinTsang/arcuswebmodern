'use client';

/**
 * DoorChimeSettings — the Doors & Locks "More" tab: whether the hub (and
 * keypad) chimes when each contact sensor or hinge opens.
 *
 * Replaces src/components/subsystem/doors-locks/settings/. Writes the whole
 * `subdoorsnlocks:chimeConfig` set back with one entry flipped, as the
 * legacy client did.
 */

import { useState, useCallback, useMemo } from 'react';
import { Base, Device, DoorsNLocksSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { useDoorsLocksSubsystem } from '@/hooks/useDoorsLocksSubsystem';
import { selectAllDevices } from '@/store/slices/devicesSlice';
import SettingToggle from '@/components/SettingToggle';
import type { DoorChimeEntry } from '@/store/entityTypes';

interface ChimeRow {
  entry: DoorChimeEntry;
  name: string;
}

export function DoorChimeSettings() {
  const dispatch = useAppDispatch();
  const { subsystem, chimeConfig } = useDoorsLocksSubsystem();
  const devices = useAppSelector(selectAllDevices);
  const [saving, setSaving] = useState(false);

  const subsystemAddress = subsystem?.[Base.ATTR_ADDRESS];

  const rows = useMemo<ChimeRow[]>(() => chimeConfig
    .map((entry) => {
      const device = devices.find((d) => d[Base.ATTR_ADDRESS] === entry.device);
      return { entry, name: (device?.[Device.ATTR_NAME] as string | undefined) ?? 'Unknown device' };
    })
    .sort((a, b) => a.name.localeCompare(b.name)), [chimeConfig, devices]);

  const handleToggle = useCallback(async (deviceAddress: string) => {
    if (!subsystemAddress || saving) return;
    const updated = chimeConfig.map((c) => ({
      device: c.device,
      enabled: c.device === deviceAddress ? !c.enabled : c.enabled,
    }));
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, subsystemAddress, {
        [DoorsNLocksSubsystem.ATTR_CHIMECONFIG]: updated,
      });
    } catch {
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
        Chime the hub when a contact sensor or hinge is opened.
      </p>
      {rows.map(({ entry, name }) => (
        <SettingToggle
          key={entry.device}
          label={name}
          description="Chime when opened"
          enabled={entry.enabled}
          onToggle={() => handleToggle(entry.device)}
          testId={`door-chime-toggle-${entry.device}`}
        />
      ))}
    </div>
  );
}
