'use client';

import { useCallback } from 'react';
import { Base, SpaceHeater, TwinStar } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

interface StringOption {
  value: string;
  label: string;
}

const STATES: StringOption[] = [
  { value: SpaceHeater.HEATSTATE_OFF, label: 'Off' },
  { value: SpaceHeater.HEATSTATE_ON, label: 'On' },
];

const ECO_MODES: StringOption[] = [
  { value: TwinStar.ECOMODE_DISABLED, label: 'Standard' },
  { value: TwinStar.ECOMODE_ENABLED, label: 'EcoMode' },
];

function optionClass(selected: boolean): string {
  return `
    px-3 py-1.5 text-sm rounded-[var(--border-radius-base)] transition-colors
    ${selected ? 'bg-peacock text-crane' : 'bg-pigeon text-coot hover:bg-heron'}
  `;
}

/** Space heater on/off state, plus Standard/EcoMode for TwinStar heaters. */
export default function SpaceHeaterModeConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();

  const heatState = device?.[SpaceHeater.ATTR_HEATSTATE] as string | undefined;
  const ecoMode = device?.[TwinStar.ATTR_ECOMODE] as string | undefined;
  const isTwinStar = ((device?.[Base.ATTR_CAPS] as string[] | undefined) ?? []).includes(TwinStar.NAMESPACE);

  const handleStateChange = useCallback(
    async (state: string) => {
      if (state === heatState) return;
      try {
        await setAttribute(SpaceHeater.ATTR_HEATSTATE, state);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change heater state' }));
      }
    },
    [heatState, setAttribute, dispatch],
  );

  const handleEcoModeChange = useCallback(
    async (mode: string) => {
      if (mode === ecoMode) return;
      try {
        await setAttribute(TwinStar.ATTR_ECOMODE, mode);
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to change heater mode' }));
      }
    },
    [ecoMode, setAttribute, dispatch],
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-swift mb-2">Heater State</p>
        <div className="flex gap-2">
          {STATES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStateChange(s.value)}
              aria-pressed={heatState === s.value}
              data-testid={`spaceheater-state-${s.value.toLowerCase()}`}
              className={optionClass(heatState === s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {isTwinStar && (
        <div>
          <p className="text-sm font-medium text-swift mb-2">Heater Mode</p>
          <div className="flex gap-2">
            {ECO_MODES.map((m) => (
              <button
                key={m.value}
                onClick={() => handleEcoModeChange(m.value)}
                aria-pressed={ecoMode === m.value}
                data-testid={`spaceheater-ecomode-${m.value.toLowerCase()}`}
                className={optionClass(ecoMode === m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
