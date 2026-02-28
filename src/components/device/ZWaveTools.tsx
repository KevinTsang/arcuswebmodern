'use client';

/**
 * ZWaveTools — Z-Wave network management panel.
 *
 * Replaces src/pages/devices/subviews/zwave.component.
 * Provides Z-Wave network rebuild and device removal guidance.
 */

import { useState, useCallback } from 'react';
import Bridge from '@arcus/core/bridge';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';

export function ZWaveTools() {
  const hub = useAppSelector((s) => s.hub.hub);
  const dispatch = useAppDispatch();
  const [rebuilding, setRebuilding] = useState(false);
  const [removeExpanded, setRemoveExpanded] = useState(false);
  const [rebuildExpanded, setRebuildExpanded] = useState(false);

  const hubAddress = (hub?.['base:address'] as string) ?? '';
  const numZWaveDevices = (hub?.['hubzwave:numDevices'] as number) ?? 0;
  const canRebuild = numZWaveDevices > 0;

  const handleRebuild = useCallback(async () => {
    if (!hubAddress) return;
    setRebuilding(true);
    try {
      await Bridge.request('hubzwave:Heal', hubAddress, { block: false });
      dispatch(addNotification({ type: 'success', message: 'Z-Wave network rebuild started' }));
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to start Z-Wave rebuild' }));
    }
    setRebuilding(false);
  }, [hubAddress, dispatch]);

  return (
    <div className="space-y-2">
      {/* Remove Z-Wave Device */}
      <div className="border border-heron rounded-[var(--border-radius-base)]">
        <button
          onClick={() => setRemoveExpanded(!removeExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-pigeon transition-colors"
        >
          <span className="font-medium text-swift">Remove Z-Wave Device</span>
          <span className="text-grouse">{removeExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>
        {removeExpanded && (
          <div className="border-t border-heron px-4 py-4">
            <p className="text-sm text-grouse mb-3">
              To remove a Z-Wave device, please use the Arcus mobile app. The removal process
              requires physical interaction with the device and is best handled through the app.
            </p>
            <p className="text-sm text-grouse">
              If a device has already been physically removed, you can force-remove it from
              the device&apos;s details panel in the device list.
            </p>
          </div>
        )}
      </div>

      {/* Rebuild Z-Wave Network */}
      <div className="border border-heron rounded-[var(--border-radius-base)]">
        <button
          onClick={() => setRebuildExpanded(!rebuildExpanded)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-pigeon transition-colors"
        >
          <span className="font-medium text-swift">Rebuild Z-Wave Network</span>
          <span className="text-grouse">{rebuildExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>
        {rebuildExpanded && (
          <div className="border-t border-heron px-4 py-4">
            <p className="text-sm text-grouse mb-3">
              Rebuilding the Z-Wave network optimizes communication paths between your hub
              and Z-Wave devices. This is useful after moving devices or if you&apos;re experiencing
              connectivity issues.
            </p>
            <p className="text-sm text-grouse mb-4">
              <strong>Note:</strong> During the rebuild, Z-Wave devices may be temporarily
              unresponsive. The rebuild can take several minutes depending on the number of devices.
            </p>
            {canRebuild ? (
              <button
                onClick={handleRebuild}
                disabled={rebuilding}
                className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50"
              >
                {rebuilding ? 'Starting...' : 'Rebuild Z-Wave Network'}
              </button>
            ) : (
              <p className="text-sm text-grouse italic">
                No Z-Wave devices found. Pair Z-Wave devices to use this tool.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
