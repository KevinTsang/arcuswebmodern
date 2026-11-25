'use client';

/**
 * DoorChimeRow — one door contact sensor's "chime when opened" switch on the
 * Doors & Locks "More" tab.
 */

import { useCallback } from 'react';
import SettingToggle from '@/components/SettingToggle';
import type { DoorChimeEntry } from '@/store/entityTypes';

interface DoorChimeRowProps {
  entry: DoorChimeEntry;
  name: string;
  disabled: boolean;
  onToggle: (deviceAddress: string) => void;
}

export function DoorChimeRow({ entry, name, disabled, onToggle }: DoorChimeRowProps) {
  const handleToggle = useCallback(() => onToggle(entry.device), [onToggle, entry.device]);

  return (
    <SettingToggle
      label={name}
      description="Chime when opened"
      enabled={entry.enabled}
      onToggle={handleToggle}
      disabled={disabled}
      testId={`door-chime-toggle-${entry.device}`}
    />
  );
}
