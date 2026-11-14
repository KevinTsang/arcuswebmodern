'use client';

/**
 * ThermostatScheduleSetpoints — setpoint controls for a thermostat schedule event.
 *
 * Replaces the legacy heat/cool/auto schedule device configurators. HEAT and
 * COOL events edit a single setpoint; AUTO events edit both, keeping the
 * device's minimum heat/cool separation. All setpoints stay within the
 * device's min/max limits.
 */

import { useCallback } from 'react';
import { Thermostat } from '@arcus/core';
import {
  DEFAULT_COOL_SETPOINT_F,
  DEFAULT_HEAT_SETPOINT_F,
  fahrenheitToCelsius,
  setpointF,
  type SetpointLimits,
} from '@/lib/thermostatSchedule';
import type { ScheduleAttributeEditorProps } from './types';
import { ThermostatSetpointStepper } from './ThermostatSetpointStepper';

interface ThermostatScheduleSetpointsProps extends ScheduleAttributeEditorProps {
  limits: SetpointLimits;
}

export function ThermostatScheduleSetpoints({
  scheduleId,
  attributes,
  onChange,
  limits,
}: ThermostatScheduleSetpointsProps) {
  const isAuto = scheduleId === Thermostat.HVACMODE_AUTO;
  const showHeat = isAuto || scheduleId === Thermostat.HVACMODE_HEAT;
  const showCool = isAuto || scheduleId === Thermostat.HVACMODE_COOL;
  const { minF, maxF, separationF } = limits;

  const heatF = setpointF(attributes, Thermostat.ATTR_HEATSETPOINT, DEFAULT_HEAT_SETPOINT_F);
  const coolF = setpointF(attributes, Thermostat.ATTR_COOLSETPOINT, DEFAULT_COOL_SETPOINT_F);

  // In AUTO the heat setpoint must stay `separationF` below cool, and vice versa.
  const heatMin = minF;
  const heatMax = isAuto ? Math.min(maxF - separationF, coolF - separationF) : maxF;
  const coolMin = isAuto ? Math.max(minF + separationF, heatF + separationF) : minF;
  const coolMax = maxF;

  const handleHeatChange = useCallback(
    (nextF: number) => {
      onChange({ ...attributes, [Thermostat.ATTR_HEATSETPOINT]: fahrenheitToCelsius(nextF) });
    },
    [attributes, onChange],
  );

  const handleCoolChange = useCallback(
    (nextF: number) => {
      onChange({ ...attributes, [Thermostat.ATTR_COOLSETPOINT]: fahrenheitToCelsius(nextF) });
    },
    [attributes, onChange],
  );

  if (!showHeat && !showCool) return null;

  return (
    <div data-testid="thermostat-schedule-setpoints">
      <label className="block text-sm font-medium text-swift mb-2">
        {isAuto ? 'Temperature Range' : 'Temperature'}
      </label>
      {isAuto && (
        <p data-testid="thermostat-schedule-separation" className="text-xs text-grouse mb-2">
          In this mode, heat and cool setpoints must stay at least {separationF}&deg; apart.
        </p>
      )}
      <div className="space-y-2">
        {showHeat && (
          <ThermostatSetpointStepper
            id="heat"
            label={isAuto ? 'Heat To' : 'Heat Set Point'}
            valueF={heatF}
            minF={heatMin}
            maxF={heatMax}
            color="cardinal"
            onChange={handleHeatChange}
          />
        )}
        {showCool && (
          <ThermostatSetpointStepper
            id="cool"
            label={isAuto ? 'Cool To' : 'Cool Set Point'}
            valueF={coolF}
            minF={coolMin}
            maxF={coolMax}
            color="peacock"
            onChange={handleCoolChange}
          />
        )}
      </div>
    </div>
  );
}
