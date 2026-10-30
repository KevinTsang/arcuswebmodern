import { renderHook, act } from '@testing-library/react';
import { Base, Device, DeviceAdvanced, Hub, PairingDevice } from '@arcus/core';
import {
  useDeviceRemoval,
  isHubRemovalMode,
  REMOVE_TIMEOUT,
  FORCE_REMOVE_TIMEOUT,
} from '@/hooks/useDeviceRemoval';
import { UnpairingAction } from '@/lib/hubUnpairing';
import type { RemoveResponse } from '@/arcus/types';
import type { DeviceEntity, HubData } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};
let mockHub: HubData | null = null;
let mockDevice: DeviceEntity | undefined;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@arcus/core/cornea', () => ({
  __esModule: true,
  default: {
    on: (event: string, listener: (...args: any[]) => void) => {
      (corneaListeners[event] ??= []).push(listener);
    },
    off: (event: string, listener: (...args: any[]) => void) => {
      corneaListeners[event] = (corneaListeners[event] ?? []).filter((l) => l !== listener);
    },
  },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) => sel({ hub: { hub: mockHub } }),
}));

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const DEVICE = 'DRIV:dev:lamp';
const OTHER_DEVICE = 'DRIV:dev:other';
const HUB = 'SERV:hub-1:hub';
const DELETED = `${Device.NAMESPACE} ${Base.EVENT_DELETED}`;
const STOP_FAILED = "Couldn't take the hub out of removal mode. The hub may stay in removal mode for a few minutes.";
const onClose = jest.fn();

const HUB_RESPONSE: RemoveResponse = {
  mode: PairingDevice.REMOVEMODE_HUB_MANUAL,
  steps: [{ id: 'pair/remove1', order: 1, instructions: ['Press the button on the device.'] }],
};
const CLOUD_RESPONSE: RemoveResponse = { mode: PairingDevice.REMOVEMODE_CLOUD, steps: [] };

function emitDeleted(address = DEVICE) {
  act(() => {
    (corneaListeners[DELETED] ?? []).forEach((l) => l({ [Base.ATTR_ADDRESS]: address }));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Route Bridge requests by command; anything unlisted resolves {}. */
function bridge(handlers: Partial<Record<string, () => Promise<unknown>>>) {
  mockBridgeRequest.mockImplementation((cmd: string) => handlers[cmd]?.() ?? Promise.resolve({}));
}

function stopCalls() {
  return mockBridgeRequest.mock.calls.filter(
    ([cmd, , attrs]) => cmd === Hub.CMD_UNPAIRINGREQUEST && attrs.actionType === UnpairingAction.STOP,
  );
}

function notification(type: string, message: string) {
  return { type: 'ui/addNotification', payload: { type, message } };
}

function renderRemoval(address = DEVICE) {
  return renderHook(({ addr }) => useDeviceRemoval(addr, 'Lamp', onClose), {
    initialProps: { addr: address },
  });
}

async function startRemoval(response: RemoveResponse = HUB_RESPONSE) {
  bridge({ [Device.CMD_REMOVE]: () => Promise.resolve(response) });
  const hook = renderRemoval();
  await act(async () => { await hook.result.current.remove(); });
  return hook;
}

/** Wait for queued promise callbacks (e.g. a STOP sent from a cleanup). */
async function flush() {
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(corneaListeners).forEach((k) => delete corneaListeners[k]);
  mockHub = { [Base.ATTR_ADDRESS]: HUB, [Hub.ATTR_STATE]: Hub.STATE_NORMAL };
  mockDevice = makeDevice(DEVICE, { [DeviceAdvanced.ATTR_PROTOCOL]: 'ZWAV' });
  bridge({});
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('isHubRemovalMode', () => {
  it.each([
    [PairingDevice.REMOVEMODE_HUB_MANUAL, true],
    [PairingDevice.REMOVEMODE_HUB_AUTOMATIC, true],
    [PairingDevice.REMOVEMODE_CLOUD, false],
    [null, false],
  ] as const)('is %s → %s', (mode, expected) => {
    expect(isHubRemovalMode(mode)).toBe(expected);
  });
});

describe('useDeviceRemoval – confirmation', () => {
  it('starts idle and toggles the confirmation prompt', () => {
    const { result } = renderRemoval();
    expect(result.current.stage).toBe('idle');

    act(() => result.current.requestRemove());
    expect(result.current.stage).toBe('confirm');

    act(() => result.current.dismissRemove());
    expect(result.current.stage).toBe('idle');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('useDeviceRemoval – dev:Remove', () => {
  it('sends dev:Remove to the device and shows the returned steps', async () => {
    const { result } = await startRemoval();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Device.CMD_REMOVE, DEVICE, {});
    expect(result.current.stage).toBe('removing');
    expect(result.current.mode).toBe(PairingDevice.REMOVEMODE_HUB_MANUAL);
    expect(result.current.hubMode).toBe(true);
    expect(result.current.steps).toEqual(HUB_RESPONSE.steps);
  });

  it('reports a cloud removal as not hub mode', async () => {
    const { result } = await startRemoval(CLOUD_RESPONSE);
    expect(result.current.hubMode).toBe(false);
  });

  it('does not report success or close until base:Deleted arrives', async () => {
    await startRemoval();
    expect(onClose).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('is requesting while dev:Remove is in flight', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    expect(result.current.stage).toBe('requesting');

    await act(async () => { pending.resolve(HUB_RESPONSE); await done; });
    expect(result.current.stage).toBe('removing');
  });

  it('notifies and returns to the prompt when dev:Remove fails for a cloud device', async () => {
    mockDevice = makeDevice(DEVICE, { [DeviceAdvanced.ATTR_PROTOCOL]: 'IPCD' });
    bridge({ [Device.CMD_REMOVE]: () => Promise.reject(new Error('nope')) });
    const { result } = renderRemoval();
    await act(async () => { await result.current.remove(); });

    expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to remove Lamp'));
    expect(result.current.stage).toBe('confirm');
    expect(stopCalls()).toHaveLength(0);
  });

  it('stops unpairing, best effort, when dev:Remove fails for a hub device', async () => {
    bridge({ [Device.CMD_REMOVE]: () => Promise.reject(new Error('timeout')) });
    const { result } = renderRemoval();
    await act(async () => { await result.current.remove(); });

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: UnpairingAction.STOP,
    });
    expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to remove Lamp'));
    expect(result.current.stage).toBe('confirm');
  });

  it('only reports the failed removal when that best-effort stop fails too', async () => {
    bridge({
      [Device.CMD_REMOVE]: () => Promise.reject(new Error('timeout')),
      [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('timeout')),
    });
    const { result } = renderRemoval();
    await act(async () => { await result.current.remove(); });

    expect(mockDispatch.mock.calls).toEqual([[notification('error', 'Failed to remove Lamp')]]);
  });

  it('can retry after dev:Remove fails', async () => {
    bridge({ [Device.CMD_REMOVE]: () => Promise.reject(new Error('nope')) });
    const { result } = renderRemoval();
    await act(async () => { await result.current.remove(); });

    bridge({ [Device.CMD_REMOVE]: () => Promise.resolve(HUB_RESPONSE) });
    await act(async () => { await result.current.remove(); });
    expect(result.current.stage).toBe('removing');
  });

  it('defaults to no steps when the response has none', async () => {
    const { result } = await startRemoval({});
    expect(result.current.mode).toBeNull();
    expect(result.current.hubMode).toBe(false);
    expect(result.current.steps).toEqual([]);
  });
});

describe('useDeviceRemoval – base:Deleted', () => {
  it('reports success, closes and stops unpairing for a hub removal', async () => {
    await startRemoval();
    emitDeleted();
    await flush();

    expect(mockDispatch.mock.calls).toEqual([[notification('success', 'Lamp removed')]]);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: UnpairingAction.STOP,
    });
  });

  it('stops unpairing for HUB_AUTOMATIC removals too', async () => {
    await startRemoval({ mode: PairingDevice.REMOVEMODE_HUB_AUTOMATIC, steps: [] });
    emitDeleted();
    expect(stopCalls()).toHaveLength(1);
  });

  it('does not send STOP_UNPAIRING for a cloud removal', async () => {
    await startRemoval(CLOUD_RESPONSE);
    emitDeleted();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(0);
  });

  it('ignores another device being deleted', async () => {
    await startRemoval();
    emitDeleted(OTHER_DEVICE);

    expect(onClose).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('ignores the device being deleted when no removal was requested', () => {
    renderRemoval();
    emitDeleted();

    expect(onClose).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('handles base:Deleted arriving before the dev:Remove response', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    emitDeleted();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(0);

    // The late response says the hub is unpairing: stop it.
    await act(async () => { pending.resolve(HUB_RESPONSE); await done; });
    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch.mock.calls).toEqual([[notification('success', 'Lamp removed')]]);
  });

  it('does not also report a failure when dev:Remove rejects after base:Deleted', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    emitDeleted();
    await act(async () => { pending.reject(new Error('timeout')); await done; });

    expect(mockDispatch.mock.calls).toEqual([[notification('success', 'Lamp removed')]]);
    expect(onClose).toHaveBeenCalledTimes(1);
    // Hub device: the hub may still have been put into unpairing mode.
    expect(stopCalls()).toHaveLength(1);
  });

  it('reports that the hub may stay unpairing when there is no hub to stop', async () => {
    mockHub = null;
    await startRemoval();
    emitDeleted();
    await flush();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(0);
    expect(mockDispatch).toHaveBeenCalledWith(notification('error', STOP_FAILED));
  });

  it('reports a failed stop after success', async () => {
    await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('offline')) });
    emitDeleted();
    await flush();

    expect(mockDispatch.mock.calls).toEqual([
      [notification('success', 'Lamp removed')],
      [notification('error', STOP_FAILED)],
    ]);
  });
});

describe('useDeviceRemoval – cancel', () => {
  it('stops unpairing, then closes', async () => {
    const { result } = await startRemoval();
    await act(async () => { await result.current.cancel(); });

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: UnpairingAction.STOP,
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('is cancelling while STOP_UNPAIRING is in flight', async () => {
    const pending = deferred<unknown>();
    const { result } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => pending.promise });

    let done!: Promise<void>;
    act(() => { done = result.current.cancel(); });
    expect(result.current.cancelling).toBe(true);

    await act(async () => { pending.resolve({}); await done; });
    expect(result.current.cancelling).toBe(false);
  });

  it('notifies but still closes when STOP_UNPAIRING fails', async () => {
    const { result } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('offline')) });
    await act(async () => { await result.current.cancel(); });

    expect(mockDispatch).toHaveBeenCalledWith(notification('error', STOP_FAILED));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('notifies and closes when there is no hub to stop', async () => {
    mockHub = null;
    const { result } = await startRemoval();
    await act(async () => { await result.current.cancel(); });

    expect(stopCalls()).toHaveLength(0);
    expect(mockDispatch).toHaveBeenCalledWith(notification('error', STOP_FAILED));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('just closes for a cloud removal', async () => {
    const { result } = await startRemoval(CLOUD_RESPONSE);
    await act(async () => { await result.current.cancel(); });

    expect(stopCalls()).toHaveLength(0);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('no longer reports success after cancelling', async () => {
    const { result } = await startRemoval();
    await act(async () => { await result.current.cancel(); });
    mockDispatch.mockClear();
    emitDeleted();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not close again when the panel closed while STOP was in flight', async () => {
    const pending = deferred<unknown>();
    const { result, unmount } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => pending.promise });

    let done!: Promise<void>;
    act(() => { done = result.current.cancel(); });
    unmount();
    await act(async () => { pending.resolve({}); await done; });

    expect(onClose).not.toHaveBeenCalled();
    // The unmount shares the stop already in flight.
    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch).toHaveBeenCalledWith(notification('warning', 'Removal of Lamp cancelled.'));
  });

  it('closes once when the device is removed while STOP was in flight', async () => {
    const pending = deferred<unknown>();
    const { result } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => pending.promise });

    let done!: Promise<void>;
    act(() => { done = result.current.cancel(); });
    emitDeleted();
    await act(async () => { pending.resolve({}); await done; });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch.mock.calls).toEqual([[notification('success', 'Lamp removed')]]);
  });
});

describe('useDeviceRemoval – hub address', () => {
  it('stops the hub the removal started on, even if the store hub changes', async () => {
    const { result, rerender } = await startRemoval();
    mockHub = { [Base.ATTR_ADDRESS]: 'SERV:hub-2:hub' };
    rerender({ addr: DEVICE });

    await act(async () => { await result.current.cancel(); });
    expect(stopCalls()).toEqual([[Hub.CMD_UNPAIRINGREQUEST, HUB, { actionType: UnpairingAction.STOP }]]);
  });

  it('still stops that hub after the hub leaves the store', async () => {
    const { result, rerender } = await startRemoval();
    mockHub = null;
    rerender({ addr: DEVICE });

    await act(async () => { await result.current.cancel(); });
    expect(stopCalls()).toEqual([[Hub.CMD_UNPAIRINGREQUEST, HUB, { actionType: UnpairingAction.STOP }]]);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});

describe('useDeviceRemoval – unmount', () => {
  it('stops unpairing and says the removal was cancelled when unmounted mid-removal', async () => {
    const { unmount } = await startRemoval();
    unmount();
    await flush();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: UnpairingAction.STOP,
    });
    expect(mockDispatch.mock.calls).toEqual([[notification('warning', 'Removal of Lamp cancelled.')]]);
  });

  it('says nothing when a cloud removal is left to finish', async () => {
    const { unmount } = await startRemoval(CLOUD_RESPONSE);
    unmount();
    await flush();

    expect(stopCalls()).toHaveLength(0);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('stops unpairing once the response arrives when unmounted mid-request', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result, unmount } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    unmount();
    expect(stopCalls()).toHaveLength(0);

    await act(async () => { pending.resolve(HUB_RESPONSE); await done; });
    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch.mock.calls).toEqual([[notification('warning', 'Removal of Lamp cancelled.')]]);
  });

  it('sends STOP_UNPAIRING only once after success', async () => {
    const { unmount } = await startRemoval();
    emitDeleted();
    unmount();
    expect(stopCalls()).toHaveLength(1);
  });

  it('sends nothing when no removal was started', () => {
    const { unmount } = renderRemoval();
    unmount();
    expect(mockBridgeRequest).not.toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('notifies when STOP_UNPAIRING fails on unmount', async () => {
    const { unmount } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('offline')) });
    await act(async () => { unmount(); });

    expect(mockDispatch).toHaveBeenCalledWith(
      notification('error', 'Removal of Lamp cancelled. The hub may stay in removal mode for a few minutes.'),
    );
  });

  it('stops listening for base:Deleted', async () => {
    const { unmount } = await startRemoval();
    unmount();
    expect(corneaListeners[DELETED]).toHaveLength(0);
  });
});

describe('useDeviceRemoval – address change', () => {
  it('ends the removal and resets the flow for the new device', async () => {
    const { result, rerender } = await startRemoval();
    expect(result.current.stage).toBe('removing');

    mockDevice = makeDevice(OTHER_DEVICE, { [DeviceAdvanced.ATTR_PROTOCOL]: 'ZIGB' });
    rerender({ addr: OTHER_DEVICE });
    await flush();

    expect(result.current.stage).toBe('idle');
    expect(result.current.mode).toBeNull();
    expect(result.current.steps).toEqual([]);
    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch.mock.calls).toEqual([[notification('warning', 'Removal of Lamp cancelled.')]]);
  });

  it('runs a fresh removal for the new device', async () => {
    const { result, rerender } = await startRemoval();
    rerender({ addr: OTHER_DEVICE });
    await flush();
    mockDispatch.mockClear();

    await act(async () => { await result.current.remove(); });
    expect(mockBridgeRequest).toHaveBeenLastCalledWith(Device.CMD_REMOVE, OTHER_DEVICE, {});
    expect(result.current.stage).toBe('removing');

    emitDeleted(DEVICE);
    expect(onClose).not.toHaveBeenCalled();
    emitDeleted(OTHER_DEVICE);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores the old device response arriving after the switch', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result, rerender } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    rerender({ addr: OTHER_DEVICE });
    await act(async () => { pending.resolve(HUB_RESPONSE); await done; });

    expect(result.current.stage).toBe('idle');
    expect(stopCalls()).toHaveLength(1);
  });
});

describe('useDeviceRemoval – timeout and Force Remove', () => {
  async function timedOut(response: RemoveResponse = HUB_RESPONSE) {
    jest.useFakeTimers();
    const hook = await startRemoval(response);
    act(() => { jest.advanceTimersByTime(REMOVE_TIMEOUT); });
    return hook;
  }

  it('offers Force Remove only after the timeout', async () => {
    jest.useFakeTimers();
    const { result } = await startRemoval();

    act(() => { jest.advanceTimersByTime(REMOVE_TIMEOUT - 1); });
    expect(result.current.stage).toBe('removing');

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.stage).toBe('timedOut');
  });

  it('does not time out once the device is removed', async () => {
    jest.useFakeTimers();
    const { result } = await startRemoval();
    emitDeleted();
    act(() => { jest.advanceTimersByTime(REMOVE_TIMEOUT); });
    expect(result.current.stage).toBe('removing');
  });

  it('asks for confirmation before force removing', async () => {
    const { result } = await timedOut();

    act(() => result.current.requestForceRemove());
    expect(result.current.stage).toBe('confirmForce');
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(Device.CMD_FORCEREMOVE, DEVICE, {});

    act(() => result.current.dismissForceRemove());
    expect(result.current.stage).toBe('timedOut');
  });

  it('sends dev:ForceRemove and reports success on base:Deleted', async () => {
    const { result } = await timedOut();
    act(() => result.current.requestForceRemove());
    await act(async () => { await result.current.forceRemove(); });

    expect(mockBridgeRequest).toHaveBeenCalledWith(Device.CMD_FORCEREMOVE, DEVICE, {});
    expect(result.current.stage).toBe('forcing');
    expect(onClose).not.toHaveBeenCalled();

    emitDeleted();
    expect(mockDispatch).toHaveBeenCalledWith(notification('success', 'Lamp removed'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(1);
  });

  it('notifies and returns to the timed-out stage when dev:ForceRemove fails', async () => {
    const { result } = await timedOut();
    bridge({ [Device.CMD_FORCEREMOVE]: () => Promise.reject(new Error('nope')) });
    act(() => result.current.requestForceRemove());
    await act(async () => { await result.current.forceRemove(); });

    expect(mockDispatch).toHaveBeenCalledWith(notification('error', 'Failed to force remove Lamp'));
    expect(result.current.stage).toBe('timedOut');
  });

  it('gives up waiting for base:Deleted after Force Remove', async () => {
    const { result } = await timedOut();
    act(() => result.current.requestForceRemove());
    await act(async () => { await result.current.forceRemove(); });

    act(() => { jest.advanceTimersByTime(FORCE_REMOVE_TIMEOUT - 1); });
    expect(result.current.stage).toBe('forcing');

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.stage).toBe('timedOut');
    expect(mockDispatch).toHaveBeenCalledWith(
      notification('error', "Couldn't confirm that Lamp was removed"),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not say the removal was cancelled when closed while force removing', async () => {
    const { result, unmount } = await timedOut();
    act(() => result.current.requestForceRemove());
    await act(async () => { await result.current.forceRemove(); });
    unmount();
    await flush();

    expect(stopCalls()).toHaveLength(1);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('can still cancel after timing out', async () => {
    const { result } = await timedOut();
    await act(async () => { await result.current.cancel(); });

    expect(stopCalls()).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('useDeviceRemoval – state machine guards', () => {
  it('does not send dev:ForceRemove before Force Remove is confirmed', async () => {
    jest.useFakeTimers();
    const { result } = await startRemoval();
    act(() => { jest.advanceTimersByTime(REMOVE_TIMEOUT); });

    await act(async () => { await result.current.forceRemove(); });
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(Device.CMD_FORCEREMOVE, DEVICE, {});
    expect(result.current.stage).toBe('timedOut');
  });

  it('ignores Cancel while dev:Remove is in flight', async () => {
    const pending = deferred<RemoveResponse>();
    bridge({ [Device.CMD_REMOVE]: () => pending.promise });
    const { result } = renderRemoval();

    let done!: Promise<void>;
    act(() => { done = result.current.remove(); });
    await act(async () => { await result.current.cancel(); });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.cancelling).toBe(false);

    await act(async () => { pending.resolve(HUB_RESPONSE); await done; });
    expect(result.current.stage).toBe('removing');
  });

  it('does not start another removal from the steps view once the flow has ended', async () => {
    const { result } = await startRemoval();
    // onClose is a mock here, so the panel stays open after Cancel.
    await act(async () => { await result.current.cancel(); });
    expect(result.current.stage).toBe('removing');

    await act(async () => { await result.current.remove(); });
    expect(mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === Device.CMD_REMOVE)).toHaveLength(1);
  });

  it('does not offer Force Remove while Cancel is in flight', async () => {
    jest.useFakeTimers();
    const pending = deferred<unknown>();
    const { result } = await startRemoval();
    act(() => { jest.advanceTimersByTime(REMOVE_TIMEOUT); });
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => pending.promise });

    let done!: Promise<void>;
    act(() => { done = result.current.cancel(); });
    act(() => result.current.requestForceRemove());
    expect(result.current.stage).toBe('timedOut');

    await act(async () => { pending.resolve({}); await done; });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
