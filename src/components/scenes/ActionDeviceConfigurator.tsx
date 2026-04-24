import { DeviceRow } from './DeviceRow';
import type { ResolvedAction, ActionConfig } from './ScenePanel';
import type { SelectorDef, SelectorValue } from './types';

interface ActionDeviceConfiguratorProps {
  action: ResolvedAction;
  configuredActions: Map<string, ActionConfig>;
  onBack: () => void;
  onToggleDevice: (action: ResolvedAction, deviceAddr: string, selectors: SelectorDef[]) => void;
  onDeviceValueChange: (actionId: string, deviceAddr: string, key: string, value: SelectorValue) => void;
}

export function ActionDeviceConfigurator({
  action,
  configuredActions,
  onBack,
  onToggleDevice,
  onDeviceValueChange,
}: ActionDeviceConfiguratorProps) {
  const deviceAddrs = Object.keys(action.selectors);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-peacock hover:underline mb-4"
      >
        &larr; Back
      </button>

      <h3 className="text-lg font-semibold text-swift mb-4">{action.name}</h3>

      <div>
        {deviceAddrs.map((addr) => {
          const selectors = action.selectors[addr] ?? [];
          const config = configuredActions.get(action.id);
          const enabled = !!config?.context[addr];
          const values = (config?.context[addr] ?? {}) as Record<string, SelectorValue>;

          return (
            <DeviceRow
              key={addr}
              deviceAddr={addr}
              selectors={selectors}
              enabled={enabled}
              values={values}
              onToggle={() => onToggleDevice(action, addr, selectors)}
              onValueChange={(key, value) => onDeviceValueChange(action.id, addr, key, value)}
              fallbackName={action.name}
            />
          );
        })}
        {deviceAddrs.length === 0 && (
          <p className="text-sm text-grouse py-4">No devices available for this action.</p>
        )}
      </div>
    </div>
  );
}
