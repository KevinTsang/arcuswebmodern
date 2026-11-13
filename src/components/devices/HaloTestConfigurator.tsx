'use client';

import { useState, useCallback, useEffect } from 'react';
import { Halo, Test } from '@arcus/core';
import { useDevice } from '@/hooks/useDeviceCapability';
import { useDeviceActions } from '@/hooks/useDeviceActions';
import { useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { formatHaloTestResult } from '@/lib/haloStatus';

/** Give up waiting for test:lastTestTime after this long; the Halo self-test takes under a minute. */
export const HALO_TEST_TIMEOUT_MS = 120_000;

function formatTestTime(ms: number | undefined): string | null {
  if (!ms) return null;
  return new Date(ms).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Halo remote self-test (halo:StartTest). Shows when the detector was last
 * tested and the result; "Testing" lasts until the Halo reports a new
 * test:lastTestTime.
 */
export default function HaloTestConfigurator({ address }: { address: string }) {
  const device = useDevice(address);
  const { sendCommand } = useDeviceActions(address);
  const dispatch = useAppDispatch();

  const lastTestTime = device?.[Test.ATTR_LASTTESTTIME] as number | undefined;
  const result = device?.[Halo.ATTR_REMOTETESTRESULT] as string | undefined;

  const [testing, setTesting] = useState(false);
  const [startedAt, setStartedAt] = useState(lastTestTime);
  if (lastTestTime !== startedAt) {
    setStartedAt(lastTestTime);
    setTesting(false);
  }

  useEffect(() => {
    if (!testing) return;
    const timer = setTimeout(() => setTesting(false), HALO_TEST_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [testing]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      await sendCommand(Halo.CMD_STARTTEST, {});
    } catch {
      setTesting(false);
      dispatch(addNotification({ type: 'error', message: 'Failed to start the Halo test' }));
    }
  }, [sendCommand, dispatch]);

  const time = formatTestTime(lastTestTime);
  const failed = !!result && result !== Halo.REMOTETESTRESULT_SUCCESS;

  return (
    <div>
      <p className="text-sm font-medium text-swift mb-2">Testing</p>
      <p className="text-xs text-grouse">Last Tested</p>
      <p data-testid="halo-test-last" className={`text-sm mb-3 ${failed ? 'text-cardinal' : 'text-coot'}`}>
        {time ? `${time}, ${formatHaloTestResult(result)}` : 'Never tested'}
      </p>
      <button
        onClick={handleTest}
        disabled={testing}
        data-testid="halo-test-now"
        className="px-4 py-1.5 text-sm font-medium rounded-[var(--border-radius-base)] bg-peacock text-crane disabled:opacity-50"
      >
        {testing ? 'Testing...' : 'Test Now'}
      </button>
    </div>
  );
}
