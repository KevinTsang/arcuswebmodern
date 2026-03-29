import { useMemo } from 'react';
import { Device } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { selectDeviceByAddress } from '@/store/slices/devicesSlice';
import { getSwitchInstances, formatInstanceName } from '@/hooks/useDeviceConfig';
import { SceneDeviceConfigurator } from './SceneDeviceConfigurator';
import type { SelectorDef, SelectorValue } from './types';
import { SelectorType } from './types';

interface DeviceRowProps {
  deviceAddr: string;
  selectors: SelectorDef[];
  enabled: boolean;
  values: Record<string, SelectorValue>;
  onToggle: () => void;
  onValueChange: (key: string, value: SelectorValue) => void;
  fallbackName?: string;
}

/**
 * Expands selectors for multi-switch devices. For each `switch` GROUP selector,
 * replaces it with per-instance selectors (e.g., `switch:relay1`, `switch:relay2`)
 * so each switch instance can be configured independently in a scene.
 */
function expandMultiSwitchSelectors(selectors: SelectorDef[], instances: string[]): SelectorDef[] {
  if (instances.length <= 1) return selectors;

  const expanded: SelectorDef[] = [];
  for (const sel of selectors) {
    if (sel.name === 'switch' && sel.type === SelectorType.GROUP) {
      for (const inst of instances) {
        expanded.push({ ...sel, name: `switch:${inst}` });
      }
    } else {
      expanded.push(sel);
    }
  }
  return expanded;
}

export function DeviceRow({
  deviceAddr,
  selectors,
  enabled,
  values,
  onToggle,
  onValueChange,
  fallbackName,
}: DeviceRowProps) {
  const device = useAppSelector((s) => selectDeviceByAddress(s, deviceAddr));
  const deviceName = (device?.[Device.ATTR_NAME] as string) ?? fallbackName ?? deviceAddr;
  const instances = useMemo(() => (device ? getSwitchInstances(device) : []), [device]);

  const expandedSelectors = useMemo(
    () => expandMultiSwitchSelectors(selectors, instances),
    [selectors, instances],
  );

  return (
    <div className="py-2 border-b border-pigeon last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-sm text-swift">{deviceName}</span>
        <button
          onClick={onToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-peacock' : 'bg-heron'}`}
          role="switch"
          aria-checked={enabled}
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-crane shadow transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>
      {enabled && expandedSelectors.length > 0 && (
        <SceneDeviceConfigurator
          selectors={expandedSelectors}
          values={values}
          onChange={onValueChange}
          instanceLabels={instances.length > 1
            ? Object.fromEntries(instances.map((k) => [`switch:${k}`, formatInstanceName(k)]))
            : undefined}
        />
      )}
    </div>
  );
}
