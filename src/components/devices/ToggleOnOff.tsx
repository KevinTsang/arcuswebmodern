'use client';

import { useState, useCallback } from 'react';
import { Switch } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { isDeviceOn } from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig } from '@/lib/deviceConfig';

export default function ToggleOnOff({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const config = device ? resolveDeviceConfig(device) : null;
  const on = device && config ? isDeviceOn(device, config) : false;
  const label = config?.['web:switch:auxLabel'] ?? (on ? 'On' : 'Off');

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute(Switch.ATTR_STATE, on ? Switch.STATE_OFF : Switch.STATE_ON);
    } finally {
      setPending(false);
    }
  }, [on, setAttribute]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full transition-colors
        ${on ? 'bg-peacock' : 'bg-heron'}
        disabled:opacity-50
      `}
      role="switch"
      aria-checked={on}
      data-testid={`device-toggle-${address}`}
      title={`Turn ${on ? 'off' : 'on'}`}
    >
      <span
        className={`
          inline-block h-5 w-5 rounded-full bg-crane shadow transition-transform
          ${on ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
}
