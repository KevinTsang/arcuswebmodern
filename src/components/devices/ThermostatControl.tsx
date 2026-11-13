'use client';

import { useCallback, useMemo, useState } from 'react';
import { Thermostat } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import {
  applySetpointChange,
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  getThermostatLimits,
  isThermostatBlocked,
  type SetpointKind,
} from '@/lib/thermostat';

const BUTTON_CLASS = 'w-6 h-6 rounded bg-pigeon text-swift text-sm hover:bg-heron disabled:opacity-40 disabled:cursor-not-allowed';

export default function ThermostatControl({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttributes } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);

  const mode = (device?.[Thermostat.ATTR_HVACMODE] as string) ?? Thermostat.HVACMODE_OFF;
  const heatSp = device?.[Thermostat.ATTR_HEATSETPOINT] as number | undefined;
  const coolSp = device?.[Thermostat.ATTR_COOLSETPOINT] as number | undefined;
  const heatF = heatSp != null ? celsiusToFahrenheit(heatSp) : undefined;
  const coolF = coolSp != null ? celsiusToFahrenheit(coolSp) : undefined;
  const limits = useMemo(() => (device ? getThermostatLimits(device) : null), [device]);
  const blocked = device ? isThermostatBlocked(device) : false;

  // A missing setpoint can't be pushed by AUTO separation, so treat it as far away.
  const nextSetpoints = useCallback(
    (kind: SetpointKind, delta: number) => {
      if (!limits) return null;
      const current = {
        heatF: heatF ?? Number.NEGATIVE_INFINITY,
        coolF: coolF ?? Number.POSITIVE_INFINITY,
      };
      return applySetpointChange(mode, current, kind, delta, limits);
    },
    [limits, heatF, coolF, mode],
  );

  const handleChange = useCallback(
    async (kind: SetpointKind, delta: number) => {
      const next = nextSetpoints(kind, delta);
      if (!next) return;
      const attrs: Record<string, number> = {};
      if (heatF != null && next.heatF !== heatF) attrs[Thermostat.ATTR_HEATSETPOINT] = fahrenheitToCelsius(next.heatF);
      if (coolF != null && next.coolF !== coolF) attrs[Thermostat.ATTR_COOLSETPOINT] = fahrenheitToCelsius(next.coolF);
      if (Object.keys(attrs).length === 0) return;
      setSaving(true);
      try {
        await setAttributes(attrs);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change thermostat temperature' }));
      } finally {
        setSaving(false);
      }
    },
    [nextSetpoints, heatF, coolF, setAttributes, dispatch],
  );

  if (mode === Thermostat.HVACMODE_OFF) {
    return <span className="text-sm text-grouse">Off</span>;
  }

  if (mode === Thermostat.HVACMODE_ECO) {
    return <span data-testid={`thermostat-eco-${address}`} className="text-sm text-grouse">Eco</span>;
  }

  if (blocked) {
    return <span data-testid={`thermostat-blocked-${address}`} className="text-sm text-grouse">Temp Timeout</span>;
  }

  const disabled = (kind: SetpointKind, delta: number) => saving || nextSetpoints(kind, delta) === null;

  return (
    <div className="flex items-center gap-3">
      {(mode === Thermostat.HVACMODE_HEAT || mode === Thermostat.HVACMODE_AUTO) && heatF != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleChange('heat', -1)} disabled={disabled('heat', -1)} aria-label="Lower heat setpoint" data-testid={`thermostat-heat-down-${address}`} className={BUTTON_CLASS}>-</button>
          <span data-testid={`thermostat-heat-value-${address}`} className="text-sm font-medium text-cardinal w-10 text-center">{heatF}&deg;</span>
          <button onClick={() => handleChange('heat', 1)} disabled={disabled('heat', 1)} aria-label="Raise heat setpoint" data-testid={`thermostat-heat-up-${address}`} className={BUTTON_CLASS}>+</button>
        </div>
      )}
      {mode === Thermostat.HVACMODE_AUTO && <span className="text-grouse text-xs">to</span>}
      {(mode === Thermostat.HVACMODE_COOL || mode === Thermostat.HVACMODE_AUTO) && coolF != null && (
        <div className="flex items-center gap-1">
          <button onClick={() => handleChange('cool', -1)} disabled={disabled('cool', -1)} aria-label="Lower cool setpoint" data-testid={`thermostat-cool-down-${address}`} className={BUTTON_CLASS}>-</button>
          <span data-testid={`thermostat-cool-value-${address}`} className="text-sm font-medium text-peacock w-10 text-center">{coolF}&deg;</span>
          <button onClick={() => handleChange('cool', 1)} disabled={disabled('cool', 1)} aria-label="Raise cool setpoint" data-testid={`thermostat-cool-up-${address}`} className={BUTTON_CLASS}>+</button>
        </div>
      )}
    </div>
  );
}
