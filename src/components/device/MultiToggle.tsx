'use client';

import { useState, useCallback } from 'react';
import { Switch } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { getSwitchInstances, formatInstanceName } from '@/hooks/useDeviceConfig';

export default function MultiToggle({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const instances = device ? getSwitchInstances(device) : [];

  const handleToggle = useCallback(
    async (instanceKey: string, currentlyOn: boolean) => {
      setPendingKey(instanceKey);
      try {
        await setAttribute(`${Switch.ATTR_STATE}:${instanceKey}`, currentlyOn ? Switch.STATE_OFF : Switch.STATE_ON);
      } finally {
        setPendingKey(null);
      }
    },
    [setAttribute],
  );

  if (!device || instances.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {instances.map((key) => {
        const on = device[`${Switch.ATTR_STATE}:${key}`] === Switch.STATE_ON;
        const pending = pendingKey === key;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <span className="text-xs text-grouse">{formatInstanceName(key)}</span>
            <button
              onClick={() => handleToggle(key, on)}
              disabled={pending}
              className={`
                relative inline-flex h-7 w-12 items-center rounded-full transition-colors
                ${on ? 'bg-peacock' : 'bg-heron'}
                disabled:opacity-50
              `}
              role="switch"
              aria-checked={on}
              title={`Turn ${formatInstanceName(key)} ${on ? 'off' : 'on'}`}
            >
              <span
                className={`
                  inline-block h-5 w-5 rounded-full bg-crane shadow transition-transform
                  ${on ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
}
