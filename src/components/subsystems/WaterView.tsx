'use client';

import type { SubsystemConfigEntry } from '@/lib/subsystemConfig';
import { GenericDeviceListView } from './GenericDeviceListView';
import { WaterStatusSummary } from './WaterStatusSummary';

/**
 * WaterView — water service page: heater / softener / flow summary above
 * the list of water devices.
 */
export function WaterView({ config }: { config: SubsystemConfigEntry }) {
  return (
    <div>
      <WaterStatusSummary />
      <GenericDeviceListView config={config} />
    </div>
  );
}
