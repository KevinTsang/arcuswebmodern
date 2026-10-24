'use client';

/**
 * ZWaveTools — Z-Wave network management panel.
 *
 * Replaces src/pages/devices/subviews/zwave.component.
 * Provides Z-Wave network rebuild and orphaned device removal.
 *
 * Orphan removal ported from src/components/zwave-tools/remove/remove.js.
 * START_UNPAIRING puts the hub into Z-Wave exclusion for up to 2 minutes, and
 * while that lasts any Z-Wave device that sends a node-info frame is excluded.
 * So the search stops the hub as soon as a device is removed, and on every way
 * out of the modal (Cancel, Done, unmount). A stop that fails can be retried
 * from the section until it succeeds or the hub leaves unpairing mode.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Bridge from '@arcus/core/bridge';
import cornea from '@arcus/core/cornea';
import { Base, Hub, HubAdvanced, HubZwave } from '@arcus/core';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addNotification } from '@/store/slices/uiSlice';
import { stopHubUnpairing, UnpairingAction } from '@/lib/hubUnpairing';
import RemoveZWaveDeviceModal from './RemoveZWaveDeviceModal';
import RemoveZWaveDeviceSuccessModal from './RemoveZWaveDeviceSuccessModal';
import RemoveZWaveDeviceFailureModal from './RemoveZWaveDeviceFailureModal';

const ORPHAN_REMOVAL_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// Hub events arrive under the `hub` namespace (address SERV:<hubId>:hub).
const HUB_VALUE_CHANGE = `${Hub.NAMESPACE} ${Base.EVENT_VALUECHANGE}`;
const HUB_UNPAIRED_DEVICE_REMOVED = `${Hub.NAMESPACE} ${HubAdvanced.EVENT_UNPAIREDDEVICEREMOVED}`;

const STOP_FAILED_MESSAGE = 'Failed to stop Z-Wave device removal';

type RemoveModalState = 'closed' | 'search' | 'success' | 'failure';

/** A hub event, with the attributes orphan removal watches in a hub base:ValueChange. */
interface HubEvent {
  [Base.ATTR_ADDRESS]: string;
  [Hub.ATTR_STATE]?: string;
  [HubZwave.ATTR_NUMDEVICES]?: number;
}

/** One START_UNPAIRING, from Remove Z-Wave Devices / Keep Searching until the modal closes. */
interface OrphanSearch {
  /** Hub START_UNPAIRING was sent to; STOP_UNPAIRING goes to it too. */
  hub: string;
  /** Last hubzwave:numDevices seen: only a decrease means a device was removed. */
  numDevices: number | undefined;
  /** A device was removed, START failed, or the hub left unpairing mode: hub events no longer apply. */
  finished: boolean;
  /** STOP_UNPAIRING in flight for this search, shared by everyone waiting on it. */
  stopping: Promise<boolean> | null;
}

export function ZWaveTools() {
  const hub = useAppSelector((s) => s.hub.hub);
  const dispatch = useAppDispatch();
  const [rebuilding, setRebuilding] = useState(false);
  const [removeExpanded, setRemoveExpanded] = useState(false);
  const [rebuildExpanded, setRebuildExpanded] = useState(false);
  const [removeModal, setRemoveModal] = useState<RemoveModalState>('closed');
  /** A STOP_UNPAIRING failed and the hub may still be excluding: offer a retry. */
  const [stopFailed, setStopFailed] = useState(false);
  const [retryingStop, setRetryingStop] = useState(false);

  const hubAddress = (hub?.[Base.ATTR_ADDRESS] as string) ?? '';
  const numZWaveDevices = (hub?.[HubZwave.ATTR_NUMDEVICES] as number) ?? 0;
  const canRebuild = numZWaveDevices > 0;

  /** The search the modal is showing; null once it closes, so later hub events are ignored. */
  const searchRef = useRef<OrphanSearch | null>(null);
  /**
   * The search whose START_UNPAIRING may still have the hub unpairing. Cleared
   * only when a STOP_UNPAIRING succeeds or the hub reports it left unpairing.
   */
  const unpairingRef = useRef<OrphanSearch | null>(null);
  /**
   * Last hub:state seen since the latest START. Only UNPAIRING → NORMAL means
   * the hub left unpairing mode: the platform also reports NORMAL when a DOWN
   * hub reconnects, while the hub itself may still be unpairing. Reset at
   * START so the NORMAL from an earlier search's STOP can't end the new one.
   */
  const hubStateRef = useRef<string | undefined>(undefined);

  /** Send STOP_UNPAIRING unless the hub has already left unpairing mode. Resolves false if it failed. */
  const stopUnpairing = useCallback((): Promise<boolean> => {
    const search = unpairingRef.current;
    if (!search) return Promise.resolve(true);
    search.stopping ??= stopHubUnpairing(search.hub)
      .then(
        () => {
          if (unpairingRef.current === search) {
            unpairingRef.current = null;
            setStopFailed(false);
          }
          return true;
        },
        () => false,
      )
      .finally(() => {
        search.stopping = null;
      });
    return search.stopping;
  }, []);

  // Leaving the page mid-search must not leave the hub excluding devices. The
  // ref keeps the cleanup to a real unmount whatever the callbacks depend on.
  const stopOnUnmountRef = useRef(() => {});
  useEffect(() => {
    stopOnUnmountRef.current = () => {
      void stopUnpairing().then((stopped) => {
        if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      });
    };
  });
  useEffect(() => () => stopOnUnmountRef.current(), []);

  const startOrphanRemoval = useCallback(async () => {
    if (!hubAddress) return;
    const search: OrphanSearch = {
      hub: hubAddress,
      numDevices: hub?.[HubZwave.ATTR_NUMDEVICES] as number | undefined,
      finished: false,
      stopping: null,
    };
    searchRef.current = search;
    // Set before sending: a request that fails may still have reached the hub.
    unpairingRef.current = search;
    hubStateRef.current = undefined;
    setStopFailed(false);
    setRemoveModal('search');
    try {
      await Bridge.request(Hub.CMD_UNPAIRINGREQUEST, hubAddress, {
        actionType: UnpairingAction.START,
        timeout: ORPHAN_REMOVAL_TIMEOUT,
        protocol: '',
        protocolId: '',
        force: false,
      });
    } catch {
      // Only for the search on screen: not after Cancel or a newer search.
      if (searchRef.current !== search || search.finished) return;
      search.finished = true;
      setRemoveModal('failure');
    }
  }, [hub, hubAddress]);

  /** Cancel / Done: close straight away (as legacy did) and stop unpairing if it's still running. */
  const closeOrphanRemoval = useCallback(() => {
    // From here on hub events, such as the NORMAL our STOP causes, belong to no search on screen.
    searchRef.current = null;
    setRemoveModal('closed');
    void stopUnpairing().then((stopped) => {
      if (stopped) return;
      dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      if (unpairingRef.current) setStopFailed(true);
    });
  }, [stopUnpairing, dispatch]);

  const retryStop = useCallback(async () => {
    setRetryingStop(true);
    const stopped = await stopUnpairing();
    setRetryingStop(false);
    if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
  }, [stopUnpairing, dispatch]);

  // Hub events, for as long as the panel is mounted: a search can end, and a
  // failed stop can be overtaken by the hub leaving unpairing, after the modal closed.
  useEffect(() => {
    /** The search found its device: show success and stop excluding before another device is caught. */
    const onDeviceRemoved = (search: OrphanSearch) => {
      search.finished = true;
      dispatch(addNotification({ type: 'success', message: 'A device was removed.' }));
      setRemoveModal('success');
      void stopUnpairing().then((stopped) => {
        if (!stopped) dispatch(addNotification({ type: 'error', message: STOP_FAILED_MESSAGE }));
      });
    };

    /** The search on screen, if this event is from its hub and it is still running. */
    const runningSearch = (event: HubEvent) => {
      const search = searchRef.current;
      return search && !search.finished && search.hub === event[Base.ATTR_ADDRESS] ? search : null;
    };

    const onHubValueChange = (change: HubEvent) => {
      const watchedHub = searchRef.current?.hub ?? unpairingRef.current?.hub;
      if (!watchedHub || change[Base.ATTR_ADDRESS] !== watchedHub) return;

      const previousState = hubStateRef.current;
      const state = change[Hub.ATTR_STATE];
      if (state !== undefined) hubStateRef.current = state;
      const leftUnpairing = previousState === Hub.STATE_UNPAIRING && state === Hub.STATE_NORMAL;
      if (leftUnpairing && unpairingRef.current) {
        unpairingRef.current = null;
        setStopFailed(false);
      }

      const search = runningSearch(change);
      if (!search) return;
      const count = change[HubZwave.ATTR_NUMDEVICES];
      if (count !== undefined) {
        const removed = search.numDevices !== undefined && count < search.numDevices;
        search.numDevices = count;
        if (removed) {
          onDeviceRemoved(search);
          return;
        }
      }
      if (leftUnpairing) {
        // The hub timed out without removing anything.
        search.finished = true;
        setRemoveModal('failure');
      }
    };

    const onUnpairedDeviceRemoved = (event: HubEvent) => {
      const search = runningSearch(event);
      if (search) onDeviceRemoved(search);
    };

    cornea.on(HUB_VALUE_CHANGE, onHubValueChange);
    cornea.on(HUB_UNPAIRED_DEVICE_REMOVED, onUnpairedDeviceRemoved);
    return () => {
      cornea.off(HUB_VALUE_CHANGE, onHubValueChange);
      cornea.off(HUB_UNPAIRED_DEVICE_REMOVED, onUnpairedDeviceRemoved);
    };
  }, [dispatch, stopUnpairing]);

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
        {stopFailed && removeModal === 'closed' && (
          <div data-testid="zwave-remove-stop-failed" className="border-t border-heron px-4 py-4">
            <p className="text-sm text-swift mb-3">
              The hub may still be removing Z-Wave devices. It stops on its own within 2 minutes.
            </p>
            <button
              onClick={retryStop}
              disabled={retryingStop}
              data-testid="zwave-remove-stop-retry"
              className="bg-peacock text-crane px-5 py-2 rounded-[var(--border-radius-base)] text-sm hover:opacity-90 disabled:opacity-50"
            >
              {retryingStop ? 'Stopping...' : 'Stop Removal Mode'}
            </button>
          </div>
        )}
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
