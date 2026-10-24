import { renderHook, act } from '@testing-library/react';
import { Base, Device, Hub } from '@arcus/core';
import {
  useDeviceRemoval,
  REMOVE_TIMEOUT,
  RemovalMode,
  type RemoveResponse,
} from '@/hooks/useDeviceRemoval';
import type { HubData } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const corneaListeners: Record<string, Array<(...args: any[]) => void>> = {};
let mockHub: HubData | null = null;

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

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const DEVICE = 'DRIV:dev:lamp';
const HUB = 'SERV:hub-1:hub';
const DELETED = `${Device.NAMESPACE} ${Base.EVENT_DELETED}`;
const onClose = jest.fn();

const HUB_RESPONSE: RemoveResponse = {
  mode: RemovalMode.HUB_MANUAL,
  steps: [{ id: 'pair/remove1', order: 1, instructions: ['Press the button on the device.'] }],
};
const CLOUD_RESPONSE: RemoveResponse = { mode: RemovalMode.CLOUD, steps: [] };

function emitDeleted(address = DEVICE) {
  act(() => {
    (corneaListeners[DELETED] ?? []).forEach((l) => l({ [Base.ATTR_ADDRESS]: address }));
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/** Route Bridge requests by command; anything unlisted resolves {}. */
function bridge(handlers: Partial<Record<string, () => Promise<unknown>>>) {
  mockBridgeRequest.mockImplementation((cmd: string) => handlers[cmd]?.() ?? Promise.resolve({}));
}

function stopCalls() {
  return mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === Hub.CMD_UNPAIRINGREQUEST);
}

function renderRemoval() {
  return renderHook(() => useDeviceRemoval(DEVICE, 'Lamp', onClose));
}

async function startRemoval(response: RemoveResponse = HUB_RESPONSE) {
  bridge({ [Device.CMD_REMOVE]: () => Promise.resolve(response) });
  const hook = renderRemoval();
  await act(async () => { await hook.result.current.remove(); });
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(corneaListeners).forEach((k) => delete corneaListeners[k]);
  mockHub = { [Base.ATTR_ADDRESS]: HUB, [Hub.ATTR_STATE]: Hub.STATE_NORMAL };
  bridge({});
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

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
    expect(result.current.mode).toBe(RemovalMode.HUB_MANUAL);
    expect(result.current.steps).toEqual(HUB_RESPONSE.steps);
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

  it('notifies and returns to the prompt when dev:Remove fails', async () => {
    bridge({ [Device.CMD_REMOVE]: () => Promise.reject(new Error('nope')) });
    const { result } = renderRemoval();
    await act(async () => { await result.current.remove(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to remove Lamp' },
    });
    expect(result.current.stage).toBe('confirm');
    expect(stopCalls()).toHaveLength(0);
  });

  it('defaults to no steps when the response has none', async () => {
    const { result } = await startRemoval({});
    expect(result.current.mode).toBeNull();
    expect(result.current.steps).toEqual([]);
  });
});

describe('useDeviceRemoval – base:Deleted', () => {
  it('reports success, closes and stops unpairing for a hub removal', async () => {
    await startRemoval();
    emitDeleted();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Lamp removed' },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: 'STOP_UNPAIRING',
    });
  });

  it('stops unpairing for HUB_AUTOMATIC removals too', async () => {
    await startRemoval({ mode: RemovalMode.HUB_AUTOMATIC, steps: [] });
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
    emitDeleted('DRIV:dev:other');

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
  });

  it('skips STOP_UNPAIRING when there is no hub', async () => {
    mockHub = null;
    await startRemoval();
    emitDeleted();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(0);
  });
});

describe('useDeviceRemoval – cancel', () => {
  it('stops unpairing, then closes', async () => {
    const { result } = await startRemoval();
    await act(async () => { await result.current.cancel(); });

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: 'STOP_UNPAIRING',
    });
    expect(onClose).toHaveBeenCalledTimes(1);
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

  it('notifies and stays open when STOP_UNPAIRING fails, and can retry', async () => {
    const { result } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('offline')) });
    await act(async () => { await result.current.cancel(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to take the hub out of removal mode' },
    });
    expect(onClose).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('removing');

    bridge({});
    await act(async () => { await result.current.cancel(); });
    expect(stopCalls()).toHaveLength(2);
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
});

describe('useDeviceRemoval – unmount', () => {
  it('stops unpairing when unmounted mid-removal', async () => {
    const { unmount } = await startRemoval();
    unmount();

    expect(mockBridgeRequest).toHaveBeenCalledWith(Hub.CMD_UNPAIRINGREQUEST, HUB, {
      actionType: 'STOP_UNPAIRING',
    });
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
  });

  it('notifies when STOP_UNPAIRING fails on unmount', async () => {
    const { unmount } = await startRemoval();
    bridge({ [Hub.CMD_UNPAIRINGREQUEST]: () => Promise.reject(new Error('offline')) });
    await act(async () => { unmount(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to take the hub out of removal mode' },
    });
  });

  it('stops listening for base:Deleted', async () => {
    const { unmount } = await startRemoval();
    unmount();
    expect(corneaListeners[DELETED]).toHaveLength(0);
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
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'success', message: 'Lamp removed' },
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stopCalls()).toHaveLength(1);
  });

  it('notifies and returns to the timed-out stage when dev:ForceRemove fails', async () => {
    const { result } = await timedOut();
    bridge({ [Device.CMD_FORCEREMOVE]: () => Promise.reject(new Error('nope')) });
    act(() => result.current.requestForceRemove());
    await act(async () => { await result.current.forceRemove(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to force remove Lamp' },
    });
    expect(result.current.stage).toBe('timedOut');
  });

  it('can still cancel after timing out', async () => {
    const { result } = await timedOut();
    await act(async () => { await result.current.cancel(); });

    expect(stopCalls()).toHaveLength(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
