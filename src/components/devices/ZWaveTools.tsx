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
import { Base, Hub, HubAdvanced, HubZwave } from '@arcus/core';
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

  const hubAddress = (hub?.[Base.ATTR_ADDRESS] as string) ?? '';
  const numZWaveDevices = (hub?.[HubZwave.ATTR_NUMDEVICES] as number) ?? 0;
  const canRebuild = numZWaveDevices > 0;

  // Track whether a device was removed during the current search session
  const deviceRemovedRef = useRef(false);
  // Whether the hub may still be in unpairing (exclusion) mode from our
  // START_UNPAIRING. While it is, any Z-Wave device that sends a node-info
  // frame is excluded, so every way out of the modal stops it.
  const unpairingRef = useRef(false);
  const hubAddressRef = useRef(hubAddress);
  useEffect(() => {
    hubAddressRef.current = hubAddress;
  }, [hubAddress]);

  /** Send STOP_UNPAIRING unless the hub has already left unpairing mode. */
  const stopUnpairing = useCallback(async () => {
    const address = hubAddressRef.current;
    if (!unpairingRef.current || !address) return;
    unpairingRef.current = false;
    try {
      await Bridge.request(Hub.CMD_UNPAIRINGREQUEST, address, {
        actionType: 'STOP_UNPAIRING',
      });
    } catch {
      dispatch(addNotification({ type: 'error', message: 'Failed to stop Z-Wave device removal' }));
    }
  }, [dispatch]);

  // Leaving the page mid-search must not leave the hub excluding devices.
  useEffect(() => () => {
    void stopUnpairing();
  }, [stopUnpairing]);

  const startOrphanRemoval = useCallback(async () => {
    if (!hubAddress) return;
    deviceRemovedRef.current = false;
    // Set before sending: even a failed request may have reached the hub.
    unpairingRef.current = true;
    setRemoveModal('search');
    try {
      await Bridge.request(Hub.CMD_UNPAIRINGREQUEST, hubAddress, {
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

  /** Cancel / Done: stop unpairing if it's still running, then close. */
  const closeOrphanRemoval = useCallback(async () => {
    await stopUnpairing();
    setRemoveModal('closed');
  }, [stopUnpairing]);

  // Listen for hub state changes and device removal events while modal is open
  useEffect(() => {
    if (removeModal === 'closed') return;

    const onDeviceRemoved = () => {
      // The hub stays in unpairing mode (and keeps excluding) after removing a
      // device, so stay on the search screen until hub:state returns to NORMAL.
      deviceRemovedRef.current = true;
      dispatch(addNotification({ type: 'success', message: 'A device was removed.' }));
    };

    const onHubValueChange = (obj: Record<string, unknown>) => {
      // numDevices changed → device removed
      if (HubZwave.ATTR_NUMDEVICES in obj) {
        onDeviceRemoved();
      }
      // hub:state went from UNPAIRING back to NORMAL → search finished
      if (obj[Hub.ATTR_STATE] === Hub.STATE_NORMAL) {
        unpairingRef.current = false;
        setRemoveModal((prev) => {
          if (prev === 'search') {
            return deviceRemovedRef.current ? 'success' : 'failure';
          }
          return prev;
        });
      }
    };

    // Hub events arrive under the `hub` namespace (address SERV:<hubId>:hub).
    cornea.on(`${Hub.NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onHubValueChange);
    cornea.on(HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED, onDeviceRemoved);

    return () => {
      cornea.off(`${Hub.NAMESPACE} ${Base.EVENT_VALUECHANGE}`, onHubValueChange);
      cornea.off(HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED, onDeviceRemoved);
    };
  }, [removeModal, dispatch]);

  const handleRebuild = useCallback(async () => {
    if (!hubAddress) return;
    setRebuilding(true);
    try {
      await Bridge.request(HubZwave.CMD_HEAL, hubAddress, { block: false });
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
          data-testid="zwave-remove-section"
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
              data-testid="zwave-remove-start"
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
          data-testid="zwave-rebuild-section"
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
                data-testid="zwave-rebuild-start"
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
        <div data-testid="zwave-remove-modal" data-state={removeModal} className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-swift/50" />
          <div className="relative bg-crane rounded-[var(--border-radius-base)] shadow-lg max-w-md w-full mx-4 p-6">
            {removeModal === 'search' && (
              <RemoveZWaveDeviceModal onCancel={closeOrphanRemoval} />
            )}
            {removeModal === 'success' && (
              <RemoveZWaveDeviceSuccessModal onDone={closeOrphanRemoval} />
            )}
            {removeModal === 'failure' && (
              <RemoveZWaveDeviceFailureModal
                onKeepSearching={startOrphanRemoval}
                onCancel={closeOrphanRemoval}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
