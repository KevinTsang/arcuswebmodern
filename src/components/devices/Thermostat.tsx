'use client';

/**
 * Thermostat — full thermostat control component.
 *
 * Replaces src/components/thermostat/. Provides mode switching,
 * heat/cool setpoint controls with min/max validation, and
 * setpoint separation enforcement in AUTO mode.
 */

import { useState, useCallback, useEffect } from 'react';
import { Thermostat as ThermostatCap, Temperature } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions, useThermostatActions } from '@/hooks/useDeviceActions';
import { formatTemp, cToF } from '@/hooks/useDeviceConfig';

const VALID_MODES = [ThermostatCap.HVACMODE_OFF, ThermostatCap.HVACMODE_HEAT, ThermostatCap.HVACMODE_COOL, ThermostatCap.HVACMODE_AUTO, ThermostatCap.HVACMODE_ECO];
const MIN_SEPARATION = 3; // degrees F
const MIN_SETPOINT_F = 45;
const MAX_SETPOINT_F = 95;
const DEFAULT_HEAT_F = 68;
const DEFAULT_COOL_F = 78;

interface ThermostatProps {
  address: string;
}

export function Thermostat({ address }: ThermostatProps) {
  const device = useDevice(address);
  const { setMode, setHeatSetpoint, setCoolSetpoint } = useThermostatActions(address);
  const { setAttribute } = useDeviceActions(address);

  const currentMode = (device?.[ThermostatCap.ATTR_HVACMODE] as string) ?? ThermostatCap.HVACMODE_OFF;
  const currentTemp = device?.[Temperature.ATTR_TEMPERATURE] as number | undefined;
  const heatSp = device?.[ThermostatCap.ATTR_HEATSETPOINT] as number | undefined;
  const coolSp = device?.[ThermostatCap.ATTR_COOLSETPOINT] as number | undefined;
  const active = device?.[ThermostatCap.ATTR_ACTIVE] as string | undefined;
  const supportedModes = (device?.[ThermostatCap.ATTR_SUPPORTEDMODES] as string[]) ?? VALID_MODES;
  const hasSchedule = !!(device?.['web:dev:scheduleConfig']);

  // Local state for setpoints (in Fahrenheit for UI)
  const [localHeatF, setLocalHeatF] = useState(DEFAULT_HEAT_F);
  const [localCoolF, setLocalCoolF] = useState(DEFAULT_COOL_F);

  // Sync from device state
  useEffect(() => {
    if (heatSp != null) setLocalHeatF(cToF(heatSp));
  }, [heatSp]);

  useEffect(() => {
    if (coolSp != null) setLocalCoolF(cToF(coolSp));
  }, [coolSp]);

  const fToC = (f: number) => (f - 32) * 5 / 9;

  // Constrained setpoint changes
  const adjustHeat = useCallback(
    (delta: number) => {
      const newF = Math.max(MIN_SETPOINT_F, Math.min(
        currentMode === ThermostatCap.HVACMODE_AUTO ? localCoolF - MIN_SEPARATION : MAX_SETPOINT_F,
        localHeatF + delta,
      ));
      setLocalHeatF(newF);
      setHeatSetpoint(fToC(newF));
    },
    [localHeatF, localCoolF, currentMode, setHeatSetpoint],
  );

  const adjustCool = useCallback(
    (delta: number) => {
      const newF = Math.max(
        currentMode === ThermostatCap.HVACMODE_AUTO ? localHeatF + MIN_SEPARATION : MIN_SETPOINT_F,
        Math.min(MAX_SETPOINT_F, localCoolF + delta),
      );
      setLocalCoolF(newF);
      setCoolSetpoint(fToC(newF));
    },
    [localCoolF, localHeatF, currentMode, setCoolSetpoint],
  );

  const handleModeChange = useCallback(
    (newMode: string) => {
      setMode(newMode);
    },
    [setMode],
  );

  const displayTemp = currentTemp != null ? cToF(currentTemp) : null;

  return (
    <div className="space-y-6">
      {/* Current temperature display */}
      {displayTemp != null && (
        <div className="text-center">
          <div className="text-4xl font-light text-swift">
            {displayTemp}<span className="text-xl">&deg;F</span>
          </div>
          <p className="text-sm text-grouse mt-1">
            Current Temperature
            {active === ThermostatCap.ACTIVE_RUNNING && (
              <span className="ml-2 text-peacock font-medium">
                {currentMode === ThermostatCap.HVACMODE_HEAT ? 'Heating' : currentMode === ThermostatCap.HVACMODE_COOL ? 'Cooling' : 'Active'}
              </span>
            )}
          </p>
        </div>
      )}

      {/* Mode selector */}
      <div>
        <p className="text-sm font-medium text-swift mb-2">Mode</p>
        <div className="flex gap-1 bg-pigeon rounded-[var(--border-radius-base)] p-1">
          {supportedModes.filter((m) => (VALID_MODES as readonly string[]).includes(m)).map((mode) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`
                flex-1 px-3 py-2 rounded text-sm font-medium transition-colors
                ${currentMode === mode
                  ? mode === ThermostatCap.HVACMODE_HEAT ? 'bg-cardinal/20 text-cardinal shadow-sm'
                    : mode === ThermostatCap.HVACMODE_COOL ? 'bg-peacock/20 text-peacock shadow-sm'
                    : 'bg-crane text-swift shadow-sm'
                  : 'text-grouse hover:text-coot'}
              `}
            >
              {mode === ThermostatCap.HVACMODE_OFF ? 'Off' : mode === ThermostatCap.HVACMODE_HEAT ? 'Heat' : mode === ThermostatCap.HVACMODE_COOL ? 'Cool' : mode === ThermostatCap.HVACMODE_AUTO ? 'Auto' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Setpoint controls */}
      {currentMode !== ThermostatCap.HVACMODE_OFF && currentMode !== ThermostatCap.HVACMODE_ECO && (
        <div className="space-y-4">
          {/* Heat setpoint */}
          {(currentMode === ThermostatCap.HVACMODE_HEAT || currentMode === ThermostatCap.HVACMODE_AUTO) && (
            <SetpointControl
              label={currentMode === ThermostatCap.HVACMODE_AUTO ? 'Heat To' : 'Heat Set Point'}
              value={localHeatF}
              color="cardinal"
              onIncrement={() => adjustHeat(1)}
              onDecrement={() => adjustHeat(-1)}
            />
          )}

          {/* Cool setpoint */}
          {(currentMode === ThermostatCap.HVACMODE_COOL || currentMode === ThermostatCap.HVACMODE_AUTO) && (
            <SetpointControl
              label={currentMode === ThermostatCap.HVACMODE_AUTO ? 'Cool To' : 'Cool Set Point'}
              value={localCoolF}
              color="peacock"
              onIncrement={() => adjustCool(1)}
              onDecrement={() => adjustCool(-1)}
            />
          )}
        </div>
      )}

      {currentMode === ThermostatCap.HVACMODE_ECO && (
        <p className="text-sm text-grouse text-center">
          Eco mode is active. Temperature setpoints are managed automatically.
        </p>
      )}
    </div>
  );
}

// ── Setpoint Control ──────────────────────────────────────────────────

function SetpointControl({
  label,
  value,
  color,
  onIncrement,
  onDecrement,
}: {
  label: string;
  value: number;
  color: 'cardinal' | 'peacock';
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="flex items-center justify-between bg-pigeon/50 rounded-[var(--border-radius-base)] p-4">
      <span className="text-sm font-medium text-swift">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={onDecrement}
          className="w-8 h-8 rounded-full bg-crane border border-heron text-swift flex items-center justify-center hover:bg-pigeon transition-colors text-lg"
        >
          -
        </button>
        <span className={`text-2xl font-medium ${color === 'cardinal' ? 'text-cardinal' : 'text-peacock'} w-16 text-center`}>
          {value}&deg;
        </span>
        <button
          onClick={onIncrement}
          className="w-8 h-8 rounded-full bg-crane border border-heron text-swift flex items-center justify-center hover:bg-pigeon transition-colors text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}
