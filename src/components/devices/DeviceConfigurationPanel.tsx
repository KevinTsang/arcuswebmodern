'use client';

/**
 * DeviceConfigurationPanel — side panel for device configuration.
 *
 * Replaces src/components/device/configuration-panel/. Shows
 * device-specific configurators (brightness, color temp, thermostat
 * mode, fan speed, etc.) based on device capabilities.
 */

import { Device } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceConfigurators } from '@/hooks/useDeviceConfig';
import { useSidePanel } from '@/components/SidePanel';
import BrightnessConfigurator from './BrightnessConfigurator';
import FanSpeedConfigurator from './FanSpeedConfigurator';
import ThermostatModeConfigurator from './ThermostatModeConfigurator';
import ColorConfigurator from './ColorConfigurator';
import ContactSettingConfigurator from './ContactSettingConfigurator';
import DeviceSettingsConfigurator from './DeviceSettingsConfigurator';

interface DeviceConfigurationPanelProps {
  address: string;
}

export function DeviceConfigurationPanel({ address }: DeviceConfigurationPanelProps) {
  const device = useDevice(address);
  const configurators = useDeviceConfigurators(address);
  const { closeRight } = useSidePanel();

  if (!device) return null;

  const name = (device[Device.ATTR_NAME] as string) ?? 'Unknown Device';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 data-testid="device-config-title" className="text-lg font-semibold text-swift">Configuration</h3>
        <button onClick={closeRight} className="text-grouse hover:text-swift text-sm">Done</button>
      </div>
      <p className="text-sm text-grouse mb-6">{name}</p>

      {configurators.length === 0 ? (
        <p data-testid="config-empty" className="text-sm text-grouse">No configurable settings for this device.</p>
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
    case 'device-settings':
      return <DeviceSettingsConfigurator address={address} />;
    default:
      return (
        <div className="text-xs text-grouse italic">
          {type} configurator (coming soon)
        </div>
      );
  }
}
