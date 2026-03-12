'use client';

/**
 * ZWaveTools — Z-Wave network management panel.
 *
 * Replaces src/pages/devices/subviews/zwave.component.
 * Provides Z-Wave network rebuild and orphaned device removal.
 *
 * Orphan removal ported from src/components/zwave-tools/remove/remove.js.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import RemoveZWaveDeviceModal from './RemoveZWaveDeviceModal';
import RemoveZWaveDeviceSuccessModal from './RemoveZWaveDeviceSuccessModal';
import RemoveZWaveDeviceFailureModal from './RemoveZWaveDeviceFailureModal';

const ORPHAN_REMOVAL_TIMEOUT = 2 * 60 * 1000; // 2 minutes

type RemoveModalState = 'closed' | 'search' | 'success' | 'failure';

export function ZWaveTools() {
  const hub = useAppSelector((s) => s.hub.hub);
  const dispatch = useAppDispatch();
  const [rebuilding, setRebuilding] = useState(false);
  const [removeExpanded, setRemoveExpanded] = useState(false);
  const [rebuildExpanded, setRebuildExpanded] = useState(false);
  const [removeModal, setRemoveModal] = useState<RemoveModalState>('closed');

  const hubAddress = (hub?.['base:address'] as string) ?? '';
  const numZWaveDevices = (hub?.['hubzwave:numDevices'] as number) ?? 0;
  const canRebuild = numZWaveDevices > 0;

  // Track whether a device was removed during the current search session
  const deviceRemovedRef = useRef(false);

  const startOrphanRemoval = useCallback(async () => {
    if (!hubAddress) return;
    deviceRemovedRef.current = false;
    setRemoveModal('search');
    try {
      await Bridge.request('hub:UnpairingRequest', hubAddress, {
        actionType: 'START_UNPAIRING',
        timeout: ORPHAN_REMOVAL_TIMEOUT,
        protocol: '',
        protocolId: '',
        force: false,
      });
    } catch {
      setRemoveModal('failure');
    }
  }, [hubAddress]);

  const cancelOrphanRemoval = useCallback(async () => {
    if (hubAddress) {
      try {
        await Bridge.request('hub:UnpairingRequest', hubAddress, {
          actionType: 'STOP_UNPAIRING',
        });
      } catch (e) {
        // Log but don't block cancellation — hub may have already returned to NORMAL
        console.error('Failed to stop unpairing:', e);
      }
    }
    setRemoveModal('closed');
  }, [hubAddress]);

  // Listen for hub state changes and device removal events while modal is open
  useEffect(() => {
    if (removeModal === 'closed') return;

    const hubNs = hubAddress ? hubAddress.replace(/:.*$/, '') : 'SERV:hub';

    const onHubValueChange = (obj: Record<string, unknown>) => {
      // numDevices decreased → device removed
      if ('hubzwave:numDevices' in obj) {
        deviceRemovedRef.current = true;
        dispatch(addNotification({ type: 'success', message: 'A device was removed.' }));
        setRemoveModal('success');
      }
      // hub:state went from UNPAIRING back to NORMAL → search finished
      if (obj['hub:state'] === 'NORMAL') {
        setRemoveModal((prev) => {
          if (prev === 'search') {
            return deviceRemovedRef.current ? 'success' : 'failure';
          }
          return prev;
        });
      }
    };

    const onUnpairedDeviceRemoved = () => {
      deviceRemovedRef.current = true;
      dispatch(addNotification({ type: 'success', message: 'A device was removed.' }));
      setRemoveModal('success');
    };

    cornea.on(`${hubNs} base:ValueChange`, onHubValueChange);
    cornea.on('hubadv:UnpairedDeviceRemoved', onUnpairedDeviceRemoved);

    return () => {
      cornea.off(`${hubNs} base:ValueChange`, onHubValueChange);
      cornea.off('hubadv:UnpairedDeviceRemoved', onUnpairedDeviceRemoved);
    };
  }, [removeModal, hubAddress, dispatch]);

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
              Search for orphaned Z-Wave devices that are no longer connected to your hub.
              During the search, put the device in &quot;learn mode&quot; (usually by pressing
              the Z-Wave button on the device).
            </p>
            <p className="text-sm text-grouse mb-4">
              <strong>Note:</strong> Do not use any other Z-Wave devices during this process
              as they may be removed inadvertently.
            </p>
            <button
              onClick={startOrphanRemoval}
              className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90"
            >
              Remove Z-Wave Devices
            </button>
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

      {/* Orphan Removal Modal */}
      {removeModal !== 'closed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-swift/50" />
          <div className="relative bg-crane rounded-[var(--border-radius-base)] shadow-lg max-w-md w-full mx-4 p-6">
            {removeModal === 'search' && (
              <RemoveZWaveDeviceModal onCancel={cancelOrphanRemoval} />
            )}
            {removeModal === 'success' && (
              <RemoveZWaveDeviceSuccessModal onDone={() => setRemoveModal('closed')} />
            )}
            {removeModal === 'failure' && (
              <RemoveZWaveDeviceFailureModal
                onKeepSearching={startOrphanRemoval}
                onCancel={() => setRemoveModal('closed')}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
