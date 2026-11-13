'use client';

/**
 * CareSilentToggle — mute the siren when a care alarm triggers. Notifications
 * and calls to the care notification list still go out.
 */

import { useState, useCallback } from 'react';
import { Base, CareSubsystem } from '@arcus/core';
import Bridge from '@arcus/core/bridge';
import { useCareSubsystem } from '@/hooks/useCareSubsystem';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import SettingToggle from '../SettingToggle';

export function CareSilentToggle() {
  const dispatch = useAppDispatch();
  const care = useCareSubsystem();
  const [saving, setSaving] = useState(false);

  const address = care.subsystem?.[Base.ATTR_ADDRESS] as string | undefined;

  const handleToggle = useCallback(async () => {
    if (!address || saving) return;
    setSaving(true);
    try {
      await Bridge.request(Base.CMD_SETATTRIBUTES, address, { [CareSubsystem.ATTR_SILENT]: !care.silent });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update silent alarm' }));
    }
    setSaving(false);
  }, [address, saving, care.silent, dispatch]);

  return (
    <SettingToggle
      label="Silent Alarm"
      description="Mute the siren when a care alarm is triggered. Notifications and calls are still sent."
      enabled={care.silent}
      onToggle={handleToggle}
      testId="care-silent-toggle"
    />
  );
}
