import { StrictMode, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, isAction, type Middleware } from '@reduxjs/toolkit';
import { PairingDevice, PairingSubsystem } from '@arcus/core';
import { usePairingFlowExit } from '@/hooks/usePairingFlowExit';
import PairingPage from '@/app/(authenticated)/pairing/page';
import KitActivatePage from '@/app/(authenticated)/kit-activate/page';
import { newPairingFlow } from '@/lib/pairingFlow';
import type { PairingFlow } from '@/components/pairing/types';
import type { PairingDevice as PairingDeviceData } from '@/store/entityTypes';
import pairingReducer, { endPairingFlow, startPairingFlow } from '@/store/slices/pairingSlice';
import { makePairingDevice, makeSubsystem } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPathname = '/pairing';
const mockPush = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

// The pairing page's stages, replaced so a test can press their buttons. The
// page passes async handlers; these are the props the tests call.
interface CustomizeProps { onCustomize: () => Promise<void> }
interface CompletedProps { onFinish: () => Promise<void> }
let capturedCustomizeProps: CustomizeProps | null = null;
let capturedCompletedProps: CompletedProps | null = null;

jest.mock('@/components/pairing', () => ({
  StageIndicator: () => null,
  StepsStage: () => null,
  SearchingStage: () => null,
  CustomizeStage: (props: CustomizeProps) => {
    capturedCustomizeProps = props;
    return null;
  },
  CompletedStage: (props: CompletedProps) => {
    capturedCompletedProps = props;
    return null;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

const PAIRING_SUB = 'SERV:subpairing:place-1';
const leftover = makePairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);
const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);

/** Every action type the store saw, to check that no toast was dispatched. */
let actionsSeen: string[] = [];
const recordActions: Middleware = () => (next) => (action) => {
  if (isAction(action)) actionsSeen.push(action.type);
  return next(action);
};

/**
 * A store with the real pairing slice and fixed state for the rest of what the
 * pairing pages read: one place with a pairing subsystem, no hub, no devices.
 */
function makeStore(flow: PairingFlow | null) {
  const store = configureStore({
    reducer: {
      pairing: pairingReducer,
      hub: () => ({ hub: null }),
      place: () => ({ placeId: 'place-1', products: [] }),
      subsystems: () => ({ ids: [PAIRING_SUB], entities: { [PAIRING_SUB]: makeSubsystem(PAIRING_SUB) } }),
      devices: () => ({ ids: [], entities: {} }),
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(recordActions),
  });
  if (flow) store.dispatch(startPairingFlow(flow));
  return store;
}

type TestStore = ReturnType<typeof makeStore>;

function Harness({ children }: { children?: ReactNode }) {
  usePairingFlowExit();
  return <>{children}</>;
}

/**
 * Render the hook at `pathname`, optionally with the page shown there.
 * `navigate` moves to another route; the page, if any, unmounts as it would.
 */
function renderAt(pathname: string, store: TestStore, page?: ReactNode, { strict = false } = {}) {
  const tree = (content?: ReactNode) => {
    const app = <Provider store={store}><Harness>{content}</Harness></Provider>;
    return strict ? <StrictMode>{app}</StrictMode> : app;
  };
  mockPathname = pathname;
  const view = render(tree(page));
  return {
    navigate(to: string) {
      mockPathname = to;
      view.rerender(tree());
    },
  };
}

function requestsSent(): Array<[string, string]> {
  return mockBridgeRequest.mock.calls.map(([command, address]) => [command, address]);
}

function commandsSent(command: string): number {
  return mockBridgeRequest.mock.calls.filter(([c]) => c === command).length;
}

/** Let the fire-and-forget requests settle. */
async function flush() {
  await act(async () => {});
}

/** A Bridge response the test resolves or rejects by hand. */
function deferred<T = object>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let warnSpy: jest.SpyInstance | undefined;

/** Silence console.warn for one test; restored in afterEach even if the test fails. */
function spyOnWarn(): jest.SpyInstance {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  return warnSpy;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockResolvedValue({});
  mockPathname = '/pairing';
  actionsSeen = [];
  capturedCustomizeProps = null;
  capturedCompletedProps = null;
  sessionStorage.clear();
});

afterEach(() => {
  warnSpy?.mockRestore();
  warnSpy = undefined;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('usePairingFlowExit – leaving pairing', () => {
  it.each(['/devices', '/home', '/settings', '/rules', '/services/climate'])(
    'ends the flow on navigating to %s: StopSearching, DismissAll, flow cleared',
    (to) => {
      const store = makeStore(newPairingFlow(PAIRING_SUB, [leftover]));
      const { navigate } = renderAt('/pairing', store);
      expect(requestsSent()).toEqual([]);

      navigate(to);

      expect(requestsSent()).toEqual([
        [PairingSubsystem.CMD_STOPSEARCHING, PAIRING_SUB],
        [PairingSubsystem.CMD_DISMISSALL, PAIRING_SUB],
      ]);
      expect(store.getState().pairing.flow).toBeNull();
    },
  );

  it.each(['/product-catalog', '/kit-activate', '/hub-setup'])('ends a flow left from %s', (from) => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt(from, store);

    navigate('/home');

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
    expect(store.getState().pairing.flow).toBeNull();
  });

  it('ends the flow once, however far the user goes', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    navigate('/devices');
    navigate('/home');
    navigate('/settings');

    expect(commandsSent(PairingSubsystem.CMD_STOPSEARCHING)).toBe(1);
    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
  });

  it('ends a flow it finds outside pairing when it mounts', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    renderAt('/home', store);

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
    expect(store.getState().pairing.flow).toBeNull();
  });

  it('sends DismissAll once under StrictMode', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    renderAt('/home', store, undefined, { strict: true });

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
  });

  it('starts the next pairing without the ended flow', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, [leftover]));
    const { navigate } = renderAt('/pairing', store);
    navigate('/devices');
    navigate('/product-catalog');
    navigate('/pairing');

    // The next search takes a new snapshot instead of reusing the old one.
    expect(store.getState().pairing.flow).toBeNull();
  });
});

describe('usePairingFlowExit – moving between pairing pages', () => {
  it('keeps the flow and sends nothing', () => {
    const flow = newPairingFlow(PAIRING_SUB, [leftover]);
    const store = makeStore(flow);
    const { navigate } = renderAt('/pairing', store);

    navigate('/product-catalog');
    navigate('/pairing');
    navigate('/kit-activate');
    navigate('/hub-setup');
    navigate('/pairing');

    expect(requestsSent()).toEqual([]);
    expect(store.getState().pairing.flow).toEqual(flow);
  });
});

describe('usePairingFlowExit – the alarms page', () => {
  it('only stops searching, and keeps the flow', () => {
    const flow = newPairingFlow(PAIRING_SUB, [leftover]);
    const store = makeStore(flow);
    const { navigate } = renderAt('/pairing', store);

    navigate('/services/alarms/status');

    expect(requestsSent()).toEqual([[PairingSubsystem.CMD_STOPSEARCHING, PAIRING_SUB]]);
    expect(store.getState().pairing.flow).toEqual(flow);
  });

  it('stops searching once while the user stays on the alarms pages', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    navigate('/services/alarms/status');
    navigate('/services/alarms/history');

    expect(requestsSent()).toEqual([[PairingSubsystem.CMD_STOPSEARCHING, PAIRING_SUB]]);
  });

  it('continues the flow when the user returns to pairing', () => {
    const flow = newPairingFlow(PAIRING_SUB, [leftover]);
    const store = makeStore(flow);
    const { navigate } = renderAt('/pairing', store);

    navigate('/services/alarms/status');
    navigate('/pairing');

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(0);
    expect(store.getState().pairing.flow).toEqual(flow);

    // A second incident interrupts the resumed search too.
    navigate('/services/alarms/status');
    expect(commandsSent(PairingSubsystem.CMD_STOPSEARCHING)).toBe(2);
  });

  it('ends the flow when the user leaves the alarms page for a page outside pairing', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    navigate('/services/alarms/status');
    navigate('/home');

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
    expect(store.getState().pairing.flow).toBeNull();
  });
});

describe('usePairingFlowExit – no active flow', () => {
  it('sends nothing on any route', () => {
    const store = makeStore(null);
    const { navigate } = renderAt('/pairing', store);

    navigate('/home');
    navigate('/services/alarms/status');
    navigate('/devices');

    expect(requestsSent()).toEqual([]);
  });

  it('does not send DismissAll again after Go to Devices or Kit Activation ended the flow', () => {
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    act(() => {
      store.dispatch(endPairingFlow());
    });
    navigate('/devices');

    expect(requestsSent()).toEqual([]);
  });
});

describe('usePairingFlowExit – failures', () => {
  it('logs a DismissAll failure, shows no toast, and still clears the flow', async () => {
    const warn = spyOnWarn();
    const error = new Error('DismissAll failed');
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_DISMISSALL ? Promise.reject(error) : Promise.resolve({}));
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    navigate('/home');
    await flush();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(PairingSubsystem.CMD_DISMISSALL), error);
    expect(actionsSeen).not.toContain('ui/addNotification');
    expect(store.getState().pairing.flow).toBeNull();
  });

  it('logs a StopSearching failure and still sends DismissAll', async () => {
    const warn = spyOnWarn();
    const error = new Error('StopSearching failed');
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_STOPSEARCHING ? Promise.reject(error) : Promise.resolve({}));
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/pairing', store);

    navigate('/home');
    await flush();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining(PairingSubsystem.CMD_STOPSEARCHING), error);
    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
    expect(store.getState().pairing.flow).toBeNull();
  });
});

describe('usePairingFlowExit – with the pairing pages', () => {
  it('sends DismissAll once when the user leaves while Go to Devices is finishing', async () => {
    jest.useFakeTimers();
    try {
      // The snapshot is empty, then the search pairs the motion sensor.
      let lists = 0;
      const dismissAll = deferred();
      mockBridgeRequest.mockImplementation((command: string) => {
        if (command === PairingSubsystem.CMD_LISTPAIRINGDEVICES) {
          lists += 1;
          return Promise.resolve({ devices: lists === 1 ? [] : [motionSensor] });
        }
        if (command === PairingSubsystem.CMD_DISMISSALL) return dismissAll.promise;
        return Promise.resolve({});
      });
      const store = makeStore(null);
      const { navigate } = renderAt('/pairing', store, <PairingPage />);

      // Search, find the motion sensor on the first poll, and save its customization.
      await act(async () => {
        await jest.advanceTimersByTimeAsync(3000);
      });
      expect(store.getState().pairing.stage).toBe('customize');
      await act(async () => {
        await capturedCustomizeProps!.onCustomize();
      });
      expect(store.getState().pairing.stage).toBe('completed');

      // Go to Devices, then a header link while its DismissAll is in flight.
      let finish: Promise<void> = Promise.resolve();
      act(() => {
        finish = capturedCompletedProps!.onFinish();
      });
      navigate('/home');
      dismissAll.resolve({});
      await act(async () => {
        await finish;
      });

      expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
      expect(store.getState().pairing.flow).toBeNull();
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('sends DismissAll once when the user leaves while Kit Activation is finishing', async () => {
    const dismissAll = deferred();
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command === PairingSubsystem.CMD_GETKITINFORMATION) {
        return Promise.resolve({ kitInfo: [{ productId: 'sensor1', protocolAddress: 'ZIGB:proto1' }] });
      }
      if (command === PairingSubsystem.CMD_LISTPAIRINGDEVICES) return Promise.resolve({ devices: [] as PairingDeviceData[] });
      if (command === PairingSubsystem.CMD_DISMISSALL) return dismissAll.promise;
      return Promise.resolve({});
    });
    const store = makeStore(newPairingFlow(PAIRING_SUB, []));
    const { navigate } = renderAt('/kit-activate', store, <KitActivatePage />);

    fireEvent.click(await screen.findByTestId('kit-finish'));
    navigate('/home');
    await act(async () => {
      dismissAll.resolve({});
    });

    expect(commandsSent(PairingSubsystem.CMD_DISMISSALL)).toBe(1);
    expect(store.getState().pairing.flow).toBeNull();
  });
});
