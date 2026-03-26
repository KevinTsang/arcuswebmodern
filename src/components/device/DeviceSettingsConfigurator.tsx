'use client';

import { DeviceSettings } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import type { ParamDescriptor } from './device-settings/types';
import { ParamControl } from './device-settings/ParamControl';

export type { ParamDescriptor } from './device-settings/types';

export default function DeviceSettingsConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const params = (device?.[DeviceSettings.ATTR_PARAMS] ?? []) as ParamDescriptor[];

  if (params.length === 0) {
    return <p className="text-sm text-grouse">No advanced settings available.</p>;
  }

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-3">Advanced Settings</p>
      <div className="space-y-4">
        {params.map((param) => (
          <ParamControl key={param.paramId} address={address} param={param} />
        ))}
      </div>
    </div>
  );
}
