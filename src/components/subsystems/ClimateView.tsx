'use client';

/**
 * ClimateView — climate subsystem with thermostat controls.
 *
 * Replaces src/components/subsystem/climate/. Shows primary
 * temperature/humidity readings and thermostat device cards.
 */

import { Base } from '@arcus/core';
import { useClimateSubsystem } from '@/hooks/useClimateSubsystem';
import { cToF, formatTemp } from '@/hooks/useDeviceConfig';
import { DevicePanel } from '@/components/devices';

export function ClimateView() {
  const { temperature, humidity, controlDevices, tempDevices } = useClimateSubsystem();

  return (
    <div className="space-y-6">
      {/* Primary readings */}
      <div className="flex gap-4">
        {temperature != null && (
          <div className="flex-1 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <div className="text-3xl font-light text-swift">
              {cToF(temperature)}<span className="text-lg">&deg;F</span>
            </div>
            <p className="text-xs text-grouse mt-1">Temperature</p>
          </div>
        )}
        {humidity != null && (
          <div className="flex-1 bg-pigeon/50 rounded-[var(--border-radius-base)] p-4 text-center">
            <div className="text-3xl font-light text-swift">
              {Math.round(humidity)}<span className="text-lg">%</span>
            </div>
            <p className="text-xs text-grouse mt-1">Humidity</p>
          </div>
        )}
      </div>

      {/* Thermostat controls */}
      {controlDevices.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-swift mb-3">Thermostats</h3>
          {controlDevices.map((device) => (
            <DevicePanel key={device.id} address={device[Base.ATTR_ADDRESS]} />
          ))}
        </div>
      )}

      {/* Temperature sensors (non-thermostat) */}
      {tempDevices.length > controlDevices.length && (
        <div>
          <h3 className="text-sm font-medium text-swift mb-3">Temperature Sensors</h3>
          {tempDevices
            .filter((d) => !controlDevices.find((c) => c.id === d.id))
            .map((device) => (
              <DevicePanel key={device.id} address={device[Base.ATTR_ADDRESS]} />
            ))}
        </div>
      )}

      {controlDevices.length === 0 && tempDevices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-grouse">No climate devices paired.</p>
        </div>
      )}
    </div>
  );
}
