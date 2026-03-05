'use client';

/**
 * DeviceActions — renders device-type-specific action controls.
 *
 * Replaces src/components/device/actions/. Instead of dynamic CanJS
 * component resolution by name, this uses a switch/case to render
 * the appropriate React control for each action type.
 */

import { memo, useState, useCallback } from 'react';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { isDeviceOn, isDeviceOpen, getSwitchInstances, formatInstanceName } from '@/hooks/useDeviceConfig';
import { resolveDeviceConfig } from '@/lib/deviceConfig';

interface DeviceActionsProps {
  address: string;
  /** Action name from config (e.g. 'toggle-on-off', 'lock-unlock') */
  action: string;
}

function DeviceActionsInner({ address, action }: DeviceActionsProps) {
  switch (action) {
    case 'toggle-on-off':
      return <ToggleOnOff address={address} />;
    case 'lock-unlock':
      return <LockUnlock address={address} />;
    case 'open-close-door':
      return <OpenCloseDoor address={address} />;
    case 'open-close-valve':
      return <OpenCloseValve address={address} />;
    case 'thermostat-slider':
      return <ThermostatControl address={address} />;
    case 'multi-toggle':
      return <MultiToggle address={address} />;
    default:
      return null;
  }
}

// ── Toggle On/Off (Switch, Dimmer, Light, Fan) ────────────────────────

function ToggleOnOff({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const config = device ? resolveDeviceConfig(device) : null;
  const on = device && config ? isDeviceOn(device, config) : false;
  const label = config?.['web:switch:auxLabel'] ?? (on ? 'On' : 'Off');

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute('swit:state', on ? 'OFF' : 'ON');
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

// ── Lock/Unlock ───────────────────────────────────────────────────────

function LockUnlock({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const locked = (device?.['doorlock:lockstate'] as string) === 'LOCKED';

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute('doorlock:lockstate', locked ? 'UNLOCKED' : 'LOCKED');
    } finally {
      setPending(false);
    }
  }, [locked, setAttribute]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className={`
        px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium transition-colors
        ${locked ? 'bg-peacock text-crane' : 'bg-cardinal/10 text-cardinal border border-cardinal/30'}
        disabled:opacity-50
      `}
    >
      {pending ? '...' : locked ? 'Unlock' : 'Lock'}
    </button>
  );
}

// ── Open/Close Door ───────────────────────────────────────────────────

function OpenCloseDoor({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const doorState = (device?.['motdoor:doorstate'] as string) ?? 'CLOSED';
  const isOpen = doorState !== 'CLOSED';

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      if (isOpen) {
        await sendCommand('motdoor:CloseGarageDoor', {});
      } else {
        await sendCommand('motdoor:OpenGarageDoor', {});
      }
    } finally {
      setPending(false);
    }
  }, [isOpen, sendCommand]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
    >
      {pending ? '...' : isOpen ? 'Close' : 'Open'}
    </button>
  );
}

// ── Open/Close Valve ──────────────────────────────────────────────────

function OpenCloseValve({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pending, setPending] = useState(false);

  const open = (device?.['valv:valvestate'] as string) === 'OPEN';

  const handleToggle = useCallback(async () => {
    setPending(true);
    try {
      await setAttribute('valv:valvestate', open ? 'CLOSED' : 'OPEN');
    } finally {
      setPending(false);
    }
  }, [open, setAttribute]);

  return (
    <button
      onClick={handleToggle}
      disabled={pending}
      className="px-4 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium bg-peacock text-crane disabled:opacity-50"
    >
      {pending ? '...' : open ? 'Close' : 'Open'}
    </button>
  );
}

// ── Multi-Toggle (ZEN17 dual relay, ZEN14 double plug, etc.) ──────────

function MultiToggle({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const instances = device ? getSwitchInstances(device) : [];

  const handleToggle = useCallback(
    async (instanceKey: string, currentlyOn: boolean) => {
      setPendingKey(instanceKey);
      try {
        await setAttribute(`swit:state:${instanceKey}`, currentlyOn ? 'OFF' : 'ON');
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
        const on = device[`swit:state:${key}`] === 'ON';
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

// ── Thermostat Control (Simplified inline, full version in Thermostat component) ──

function ThermostatControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);

  const mode = (device?.['therm:hvacmode'] as string) ?? 'OFF';
  const heatSp = device?.['therm:heatsetpoint'] as number | undefined;
  const coolSp = device?.['therm:coolsetpoint'] as number | undefined;

  // Celsius to Fahrenheit for display
  const toF = (c: number) => Math.round(c * 9 / 5 + 32);
  const toC = (f: number) => (f - 32) * 5 / 9;

  const handleHeatChange = useCallback(
    (delta: number) => {
      if (heatSp == null) return;
      const newF = toF(heatSp) + delta;
      setAttribute('therm:heatsetpoint', toC(newF));
    },
    [heatSp, setAttribute],
  );

  const handleCoolChange = useCallback(
    (delta: number) => {
      if (coolSp == null) return;
      const newF = toF(coolSp) + delta;
      setAttribute('therm:coolsetpoint', toC(newF));
    },
    [coolSp, setAttribute],
  );

  if (mode === 'OFF') {
    return <span className="text-sm text-grouse">Off</span>;
  }

  return (
    <div className="flex items-center gap-3">
      {(mode === 'HEAT' || mode === 'AUTO') && heatSp != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleHeatChange(-1)} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">-</button>
          <span className="text-sm font-medium text-cardinal w-10 text-center">{toF(heatSp)}&deg;</span>
          <button onClick={() => handleHeatChange(1)} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">+</button>
        </div>
      )}
      {mode === 'AUTO' && <span className="text-grouse text-xs">to</span>}
      {(mode === 'COOL' || mode === 'AUTO') && coolSp != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleCoolChange(-1)} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">-</button>
          <span className="text-sm font-medium text-peacock w-10 text-center">{toF(coolSp)}&deg;</span>
          <button onClick={() => handleCoolChange(1)} className="w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron">+</button>
        </div>
      )}
    </div>
  );
}

export const DeviceActions = memo(DeviceActionsInner);
