'use client';

import { useCallback, useMemo } from 'react';
import { Thermostat } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { resolveDeviceConfig } from '@/lib/deviceConfig';
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  getThermostatLimits,
  isAutoSupported,
  isEcoSupported,
  isHoneywellTcc,
  isThermostatBlocked,
  setpointsForAuto,
} from '@/lib/thermostat';

interface ModeOption {
  value: string;
  label: string;
}

interface FanModeOption {
  value: number;
  label: string;
}

const FAN_MODES: FanModeOption[] = [
  { value: Thermostat.FANMODE_AUTO, label: 'Auto' },
  { value: Thermostat.FANMODE_ON, label: 'On' },
];

function optionClass(selected: boolean): string {
  return `
    px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed
    ${selected ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron'}
  `;
}

export default function ThermostatModeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute, setAttributes } = useDeviceActions(address);
  const dispatch = useAppDispatch();

  const mode = (device?.[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;
  const fanMode = device?.[Thermostat.ATTR_FANMODE] as number | undefined;
  const heatSp = device?.[Thermostat.ATTR_HEATSETPOINT] as number | undefined;
  const coolSp = device?.[Thermostat.ATTR_COOLSETPOINT] as number | undefined;
  const autoSupported = device ? isAutoSupported(device) : true;
  const blocked = device ? isThermostatBlocked(device) : false;
  const autoDescription = useMemo(
    () => (device ? resolveDeviceConfig(device)['web:therm:autoDescription'] : 'Auto'),
    [device],
  );

  const modes = useMemo<ModeOption[]>(() => {
    const options: ModeOption[] = [
      { value: Thermostat.HVACMODE_OFF, label: 'Off' },
      { value: Thermostat.HVACMODE_HEAT, label: 'Heat' },
      { value: Thermostat.HVACMODE_COOL, label: 'Cool' },
    ];
    if (autoSupported) options.push({ value: Thermostat.HVACMODE_AUTO, label: autoDescription });
    if (device && isEcoSupported(device)) options.push({ value: Thermostat.HVACMODE_ECO, label: 'Eco' });
    return options;
  }, [device, autoSupported, autoDescription]);

  const handleModeChange = useCallback(
    async (newMode: string) => {
      if (!device || newMode === mode) return;
      try {
        // Entering AUTO with setpoints closer than the required separation
        // resets them to 68/78 °F, as the legacy client did.
        const reset = newMode === Thermostat.HVACMODE_AUTO
          ? setpointsForAuto(
            heatSp != null ? celsiusToFahrenheit(heatSp) : undefined,
            coolSp != null ? celsiusToFahrenheit(coolSp) : undefined,
            getThermostatLimits(device),
          )
          : null;
        if (reset) {
          await setAttributes({
            [Thermostat.ATTR_HVACMODE]: newMode,
            [Thermostat.ATTR_HEATSETPOINT]: fahrenheitToCelsius(reset.heatF),
            [Thermostat.ATTR_COOLSETPOINT]: fahrenheitToCelsius(reset.coolF),
          });
        } else {
          await setAttribute(Thermostat.ATTR_HVACMODE, newMode);
        }
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change thermostat mode' }));
      }
    },
    [device, mode, heatSp, coolSp, setAttribute, setAttributes, dispatch],
  );

  const handleFanModeChange = useCallback(
    async (newFanMode: number) => {
      if (newFanMode === fanMode) return;
      try {
        await setAttribute(Thermostat.ATTR_FANMODE, newFanMode);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change fan mode' }));
      }
    },
    [fanMode, setAttribute, dispatch],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-swift mb-2">HVAC Mode</p>
        <div className="flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              disabled={blocked}
              aria-pressed={mode === m.value}
              data-testid={`hvac-mode-${m.value.toLowerCase()}`}
              className={optionClass(mode === m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-swift mb-2">Fan Mode</p>
        <div className="flex gap-2">
          {FAN_MODES.map((f) => (
            <button
              key={f.value}
              onClick={() => handleFanModeChange(f.value)}
              disabled={blocked}
              aria-pressed={fanMode === f.value}
              data-testid={`fan-mode-${f.label.toLowerCase()}`}
              className={optionClass(fanMode === f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {blocked && (
        <p data-testid="thermostat-mode-blocked" className="text-xs text-grouse">
          Nest is temporarily limiting changes. Try again in a few minutes.
        </p>
      )}

      {!autoSupported && device && isHoneywellTcc(device) && (
        <div data-testid="thermostat-tcc-auto-note">
          <p className="text-sm font-medium text-swift">{autoDescription} Mode</p>
          <p className="text-xs text-grouse mt-1">
            To use {autoDescription} mode on your thermostat, Honeywell requires you to first enable
            the {autoDescription} mode setting on the device. Check the Honeywell owner&apos;s manual for details.
          </p>
        </div>
      )}
    </div>
  );
}
