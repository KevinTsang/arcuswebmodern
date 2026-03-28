'use client';

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { DeviceSettings } from '@arcus/core';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import type { ParamDescriptor } from './types';
import { EnumControl } from './EnumControl';
import { RangeControl } from './RangeControl';

export function ParamControl({ address, param }: { address: string; param: ParamDescriptor }) {
  const dispatch = useAppDispatch();
  const [saving, setSaving] = useState(false);
  const currentValue = param.value ?? String(param.dflt);

  const handleChange = useCallback(
    async (newValue: string) => {
      setSaving(true);
      try {
        const result = await Bridge.request<{ status: string }>(
          DeviceSettings.CMD_SETPARAM, address,
          { paramId: param.paramId, value: newValue },
        );
        if (result.status === DeviceSettings.STATUS_INVALID_VALUE) {
          dispatch(addNotification({ type: 'error', message: `Invalid value for ${param.description}` }));
        }
      } catch {
        dispatch(addNotification({ type: 'error', message: `Failed to update ${param.description}` }));
      } finally {
        setSaving(false);
      }
    },
    [address, param.paramId, param.description, dispatch],
  );

  return (
    <div className={`${saving ? 'opacity-60 pointer-events-none' : ''}`}>
      <p className="text-xs text-grouse mb-1.5">{param.description}</p>
      {param.type === 'enum' ? (
        <EnumControl value={currentValue} options={param.values ?? {}} onChange={handleChange} />
      ) : param.type === 'boolean' ? (
        <EnumControl value={currentValue} options={{ '0': 'Disabled', '1': 'Enabled' }} onChange={handleChange} />
      ) : (
        <RangeControl
          value={currentValue}
          min={param.min ?? 0}
          max={param.max ?? 255}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
