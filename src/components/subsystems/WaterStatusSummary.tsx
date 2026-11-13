'use client';

import { Device, Flow, WaterHeater } from '@arcus/core';
import { useWaterSubsystem } from '@/hooks/useWaterSubsystem';
import type { DeviceEntity } from '@/store/entityTypes';
import {
  celsiusToFahrenheit,
  getHotWaterLevelLabel,
  getSaltLevelPercent,
  getWaterSoftenerStatus,
} from '@/lib/waterDevices';

function deviceName(device: DeviceEntity): string {
  return (device[Device.ATTR_NAME] as string | undefined) ?? 'Unknown Device';
}

/**
 * Water service summary: the primary water heater and softener, current
 * flow, and the subsystem's low-salt / continuous / excessive use alerts.
 * Renders nothing when there is nothing beyond plain valves and leak sensors.
 */
export function WaterStatusSummary() {
  const {
    waterDevices,
    primaryWaterHeater: heater,
    primaryWaterSoftener: softener,
    lowSaltDevices,
    continuousUseDevices,
    excessiveUseDevices,
  } = useWaterSubsystem();

  const flowDevices = waterDevices.filter((d) => typeof d[Flow.ATTR_FLOW] === 'number');
  const totalFlow = flowDevices.reduce((sum, d) => sum + (d[Flow.ATTR_FLOW] as number), 0);
  const setpoint = heater?.[WaterHeater.ATTR_SETPOINT] as number | undefined;
  const saltPercent = getSaltLevelPercent(softener ?? undefined);
  const softenerLowSalt = !!softener && lowSaltDevices.some((d) => d.id === softener.id);

  const alerts: string[] = [
    ...continuousUseDevices.map((d) => `${deviceName(d)} has detected continuous water use.`),
    ...excessiveUseDevices.map((d) => `${deviceName(d)} has detected excessive water use today.`),
    ...lowSaltDevices.map((d) => `${deviceName(d)} is low on salt.`),
  ];

  if (!heater && !softener && flowDevices.length === 0 && alerts.length === 0) return null;

  return (
    <div data-testid="water-summary" className="space-y-4 mb-6">
      {alerts.length > 0 && (
        <ul data-testid="water-alerts" className="space-y-1">
          {alerts.map((msg) => (
            <li
              key={msg}
              className="text-sm text-cardinal bg-cardinal/10 border border-cardinal/30 rounded-[var(--border-radius-base)] px-3 py-2"
            >
              {msg}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-4">
        {heater && (
          <div data-testid="water-summary-heater" className="flex-1 min-w-40 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <div data-testid="water-summary-heater-setpoint" className="text-3xl font-light text-swift">
              {typeof setpoint === 'number' ? celsiusToFahrenheit(setpoint) : '--'}
              <span className="text-lg">&deg;F</span>
            </div>
            <p className="text-xs text-grouse mt-1">{deviceName(heater)}</p>
            <p data-testid="water-summary-hot-water" className="text-xs text-coot mt-0.5">
              Hot Water: {getHotWaterLevelLabel(heater[WaterHeater.ATTR_HOTWATERLEVEL] as string | undefined)}
            </p>
          </div>
        )}

        {softener && (
          <div data-testid="water-summary-softener" className="flex-1 min-w-40 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <div
              data-testid="water-summary-salt"
              className={`text-3xl font-light ${softenerLowSalt ? 'text-cardinal' : 'text-swift'}`}
            >
              {saltPercent != null ? saltPercent : '--'}
              <span className="text-lg">%</span>
            </div>
            <p className="text-xs text-grouse mt-1">{deviceName(softener)} Salt</p>
            <p data-testid="water-summary-softener-status" className="text-xs text-coot mt-0.5">
              {getWaterSoftenerStatus(softener)}
            </p>
          </div>
        )}

        {flowDevices.length > 0 && (
          <div data-testid="water-summary-flow" className="flex-1 min-w-40 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <div data-testid="water-summary-flow-value" className="text-3xl font-light text-swift">
              {totalFlow.toFixed(1)}
              <span className="text-lg"> GPM</span>
            </div>
            <p className="text-xs text-grouse mt-1">Current Water Flow</p>
          </div>
        )}
      </div>
    </div>
  );
}
