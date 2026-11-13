'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import { EcowaterWaterSoftener } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import SettingToggle from '@/components/SettingToggle';
import { FLOW_RATE_OPTIONS, getFlowRateKey } from '@/lib/waterDevices';

/**
 * EcoWater flow alerts (`water-flow`): the continuous-flow threshold that
 * triggers a notification after 20 minutes, and the learned excessive daily
 * use alert.
 */
export function WaterFlowConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { setAttributes, setAttribute } = useDeviceActions(address);
  const dispatch = useAppDispatch();
  const [pending, setPending] = useState(false);

  const flowKey = getFlowRateKey(device);
  const alertOnExcessive = device?.[EcowaterWaterSoftener.ATTR_ALERTONEXCESSIVEUSE] === true;

  const handleRateChange = useCallback(
    async (e: ChangeEvent<HTMLSelectElement>) => {
      const option = FLOW_RATE_OPTIONS.find((o) => o.key === e.target.value);
      if (!option) return;
      setPending(true);
      try {
        await setAttributes({
          [EcowaterWaterSoftener.ATTR_ALERTONCONTINUOUSUSE]: option.gpm > 0,
          [EcowaterWaterSoftener.ATTR_CONTINUOUSRATE]: option.gpm,
        });
      } catch {
        dispatch(addNotification({ type: 'error', message: 'Failed to update the continuous flow alert' }));
      } finally {
        setPending(false);
      }
    },
    [setAttributes, dispatch],
  );

  const handleToggleExcessive = useCallback(async () => {
    try {
      await setAttribute(EcowaterWaterSoftener.ATTR_ALERTONEXCESSIVEUSE, !alertOnExcessive);
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to update the excessive use alert' }));
    }
  }, [alertOnExcessive, setAttribute, dispatch]);

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Water Flow</p>
      <label htmlFor={`flow-rate-${address}`} className="block text-xs font-medium text-coot mb-1">
        Continuous Water Flow
      </label>
      <p className="text-xs text-grouse mb-2">
        Choose the flow rate that triggers a push notification and email when it has been reached for 20 minutes.
      </p>
      <select
        id={`flow-rate-${address}`}
        data-testid="water-flow-rate"
        value={flowKey}
        onChange={handleRateChange}
        disabled={pending}
        className="w-full px-3 py-1.5 text-sm bg-crane border border-heron rounded-[var(--border-radius-base)] text-swift disabled:opacity-50"
      >
        {FLOW_RATE_OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <SettingToggle
        label="Excessive Water Flow"
        description="The softener learns your average daily water usage and alerts the account owner when a day's usage is significantly higher than usual."
        enabled={alertOnExcessive}
        onToggle={handleToggleExcessive}
        testId="water-flow-excessive-toggle"
      />
    </div>
  );
}
