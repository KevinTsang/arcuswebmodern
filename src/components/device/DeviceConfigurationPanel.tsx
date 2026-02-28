'use client';

/**
 * DeviceConfigurationPanel — side panel for device configuration.
 *
 * Replaces src/components/device/configuration-panel/. Shows
 * device-specific configurators (brightness, color temp, thermostat
 * mode, fan speed, etc.) based on device capabilities.
 */

import { useState, useCallback } from 'react';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useDeviceConfigurators, formatTemp } from '@/hooks/useDeviceConfig';
import { useSidePanel } from '@/components/SidePanel';

interface DeviceConfigurationPanelProps {
  address: string;
}

export function DeviceConfigurationPanel({ address }: DeviceConfigurationPanelProps) {
  const device = useDevice(address);
  const configurators = useDeviceConfigurators(address);
  const { closeRight } = useSidePanel();

  if (!device) return null;

  const name = (device['dev:name'] as string) ?? 'Unknown Device';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-swift">Configuration</h3>
        <button onClick={closeRight} className="text-grouse hover:text-swift text-sm">Done</button>
      </div>
      <p className="text-sm text-grouse mb-6">{name}</p>

      {configurators.length === 0 ? (
        <p className="text-sm text-grouse">No configurable settings for this device.</p>
      ) : (
        <div className="space-y-6">
          {configurators.map((key) => (
            <Configurator key={key} type={key} address={address} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Configurator Components ───────────────────────────────────────────

function Configurator({ type, address }: { type: string; address: string }) {
  switch (type) {
    case 'brightness':
      return <BrightnessConfigurator address={address} />;
    case 'fan-speed':
      return <FanSpeedConfigurator address={address} />;
    case 'thermostat-mode':
      return <ThermostatModeConfigurator address={address} />;
    case 'color':
    case 'color-or-colortemp':
      return <ColorConfigurator address={address} />;
    case 'contact-setting':
      return <ContactSettingConfigurator address={address} />;
    default:
      return (
        <div className="text-xs text-grouse italic">
          {type} configurator (coming soon)
        </div>
      );
  }
}

// ── Brightness ────────────────────────────────────────────────────────

function BrightnessConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const brightness = (device?.['dim:brightness'] as number) ?? 100;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAttribute('dim:brightness', Number(e.target.value));
    },
    [setAttribute],
  );

  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-2">
        Brightness: {brightness}%
      </label>
      <input
        type="range"
        min={0}
        max={100}
        value={brightness}
        onChange={handleChange}
        className="w-full accent-peacock"
      />
    </div>
  );
}

// ── Fan Speed ─────────────────────────────────────────────────────────

function FanSpeedConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const speed = (device?.['fan:speed'] as number) ?? 0;

  const speeds = [
    { value: 0, label: 'Off' },
    { value: 33, label: 'Low' },
    { value: 66, label: 'Medium' },
    { value: 100, label: 'High' },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-2">Fan Speed</label>
      <div className="flex gap-2">
        {speeds.map((s) => (
          <button
            key={s.value}
            onClick={() => setAttribute('fan:speed', s.value)}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${speed === s.value
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Thermostat Mode ───────────────────────────────────────────────────

function ThermostatModeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const mode = (device?.['therm:hvacmode'] as string) ?? 'OFF';

  const modes = ['OFF', 'HEAT', 'COOL', 'AUTO'];

  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-2">HVAC Mode</label>
      <div className="flex gap-2">
        {modes.map((m) => (
          <button
            key={m}
            onClick={() => setAttribute('therm:hvacmode', m)}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${mode === m
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {m === 'OFF' ? 'Off' : m === 'HEAT' ? 'Heat' : m === 'COOL' ? 'Cool' : 'Auto'}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Color ─────────────────────────────────────────────────────────────

function ColorConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute, setAttributes } = useDeviceActions(address);
  const hue = (device?.['color:hue'] as number) ?? 0;
  const saturation = (device?.['color:saturation'] as number) ?? 100;
  const colortemp = (device?.['colortemp:colortemp'] as number) ?? 2700;
  const hasColorTemp = (device?.['base:caps'] as string[] | undefined)?.includes('colortemp');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-swift mb-2">
          Hue: {hue}&deg;
        </label>
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => setAttributes({ 'color:hue': Number(e.target.value), 'color:saturation': saturation })}
          className="w-full accent-peacock"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-swift mb-2">
          Saturation: {saturation}%
        </label>
        <input
          type="range"
          min={0}
          max={100}
          value={saturation}
          onChange={(e) => setAttribute('color:saturation', Number(e.target.value))}
          className="w-full accent-peacock"
        />
      </div>
      {hasColorTemp && (
        <div>
          <label className="block text-sm font-medium text-swift mb-2">
            Color Temperature: {colortemp}K
          </label>
          <input
            type="range"
            min={2000}
            max={6500}
            step={100}
            value={colortemp}
            onChange={(e) => setAttribute('colortemp:colortemp', Number(e.target.value))}
            className="w-full accent-peacock"
          />
        </div>
      )}
    </div>
  );
}

// ── Contact Setting ───────────────────────────────────────────────────

function ContactSettingConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const usehint = (device?.['cont:usehint'] as string) ?? 'UNKNOWN';

  const options = [
    { value: 'DOOR', label: 'Door' },
    { value: 'WINDOW', label: 'Window' },
    { value: 'OTHER', label: 'Other' },
  ];

  return (
    <div>
      <label className="block text-sm font-medium text-swift mb-2">Contact Type</label>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setAttribute('cont:usehint', opt.value)}
            className={`
              px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
              ${usehint === opt.value
                ? 'bg-peacock text-crane'
                : 'bg-pigeon text-coot hover:bg-heron'}
            `}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
