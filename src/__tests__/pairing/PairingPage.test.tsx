import { act, render, screen, waitFor } from '@testing-library/react';
import { Base, Device, Product, PairingDevice, PairingSubsystem } from '@arcus/core';
import PairingPage from '@/app/(authenticated)/pairing/page';
import type { PairingFlow } from '@/components/pairing/types';
import { KIT_TAG, newPairingFlow } from '@/lib/pairingFlow';
import type { ArcusEntity, PairingDevice as PairingDeviceData, SubsystemEntity } from '@/store/entityTypes';
import type { PairingState } from '@/store/slices/pairingSlice';
import { makePairingDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/slices/hubSlice', () => ({
  setHub: (payload: unknown) => ({ type: 'hub/setHub', payload }),
}));

const mockResetPairing = jest.fn(() => ({ type: 'pairing/resetPairing' }));
const mockLoadProduct = jest.fn((payload: unknown) => ({ type: 'pairing/loadProduct', payload }));

jest.mock('@/store/slices/pairingSlice', () => ({
  loadProduct: (payload: unknown) => mockLoadProduct(payload),
  startSearch: () => ({ type: 'pairing/startSearch' }),
  setDevices: (payload: unknown) => ({ type: 'pairing/setDevices', payload }),
  devicePaired: (payload: unknown) => ({ type: 'pairing/devicePaired', payload }),
  deviceMispaired: (payload: unknown) => ({ type: 'pairing/deviceMispaired', payload }),
  searchTimedOut: () => ({ type: 'pairing/searchTimedOut' }),
  searchFailed: () => ({ type: 'pairing/searchFailed' }),
  setPairingLoading: (payload: unknown) => ({ type: 'pairing/setPairingLoading', payload }),
  setSteps: (payload: unknown) => ({ type: 'pairing/setSteps', payload }),
  startHubRegistration: () => ({ type: 'pairing/startHubRegistration' }),
  hubRegistered: () => ({ type: 'pairing/hubRegistered' }),
  setHubRegistrationState: (payload: unknown) => ({ type: 'pairing/setHubRegistrationState', payload }),
  hubRegistrationError: (payload: unknown) => ({ type: 'pairing/hubRegistrationError', payload }),
  customizationComplete: () => ({ type: 'pairing/customizationComplete' }),
  startPairingFlow: (payload: unknown) => ({ type: 'pairing/startPairingFlow', payload }),
  endPairingFlow: () => ({ type: 'pairing/endPairingFlow' }),
  resetPairing: () => mockResetPairing(),
}));

// Capture subcomponent props to allow triggering callbacks in tests
let capturedStepsProps: any = {};
let capturedSearchingProps: any = {};
let capturedCustomizeProps: any = {};
let capturedCompletedProps: any = {};

jest.mock('@/components/pairing', () => ({
  StageIndicator: ({ stage }: any) => <div data-testid="stage-indicator">{stage}</div>,
  StepsStage: (props: any) => {
    capturedStepsProps = props;
    return <div data-testid="steps-stage">StepsStage</div>;
  },
  SearchingStage: (props: any) => {
    capturedSearchingProps = props;
    return <div data-testid="searching-stage">SearchingStage</div>;
  },
  CustomizeStage: (props: any) => {
    capturedCustomizeProps = props;
    return <div data-testid="customize-stage">CustomizeStage</div>;
  },
  CompletedStage: (props: any) => {
    capturedCompletedProps = props;
    return <div data-testid="completed-stage">CompletedStage</div>;
  },
}));

let mockPairingState: PairingState;
let mockHub: ArcusEntity | null = null;
let mockPlaceId: string | null = 'place-1';
let mockSubsystems: Record<string, SubsystemEntity> = {};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      hub: { hub: mockHub },
      place: { placeId: mockPlaceId },
      subsystems: {
        entities: mockSubsystems,
        ids: Object.keys(mockSubsystems),
      },
      pairing: mockPairingState,
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Route Bridge requests by command. Each ListPairingDevices call takes the next
 * list from `lists` (the last one repeats); other commands resolve their entry
 * in `responses`, or `{}`.
 */
function mockPlatform(lists: PairingDeviceData[][], responses: Record<string, object> = {}) {
  let call = 0;
  mockBridgeRequest.mockImplementation((command: string) => {
    if (command === PairingSubsystem.CMD_LISTPAIRINGDEVICES) {
      const devices = lists[Math.min(call, lists.length - 1)] ?? [];
      call += 1;
      return Promise.resolve({ devices });
    }
    return Promise.resolve(responses[command] ?? {});
  });
}

function commandsSent(): string[] {
  return mockBridgeRequest.mock.calls.map(([command]) => command);
}

function dispatchesOf(type: string) {
  return mockDispatch.mock.calls
    .map(([action]) => action)
    .filter((action) => action.type === type);
}

function devicePairedDispatches() {
  return dispatchesOf('pairing/devicePaired');
}

/** A Bridge response the test resolves or rejects by hand. */
function deferred<T = object>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

let warnSpy: jest.SpyInstance | undefined;

/** Silence console.warn for one test; restored in afterEach even if the test fails. */
function spyOnWarn(): jest.SpyInstance {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  return warnSpy;
}

/** Let pending Bridge promises settle without moving the clock. */
async function settle() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(0);
  });
}

/** Advance to the next 3 s ListPairingDevices poll and let it finish. */
async function nextPoll() {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(3000);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedStepsProps = {};
  capturedSearchingProps = {};
  capturedCustomizeProps = {};
  capturedCompletedProps = {};
  mockPairingState = {
    stage: 'steps',
    product: null,
    isHubPairing: false,
    steps: [],
    currentStep: 0,
    loading: false,
    hubId: '',
    devices: [],
    activeDevice: null,
    searchTimedOut: false,
    searchFailed: false,
    hubRegistrationState: null,
    deviceName: '',
    isFavorite: false,
    flow: null,
  };
  mockHub = null;
  mockPlaceId = 'place-1';
  mockSubsystems = {};
  sessionStorage.clear();
});

afterEach(() => {
  warnSpy?.mockRestore();
  warnSpy = undefined;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PairingPage – rendering', () => {
  it('shows Pair a Device heading when no product', () => {
    render(<PairingPage />);
    expect(screen.getByText('Pair a Device')).toBeInTheDocument();
  });

  it('shows product name in heading when product is set', () => {
    mockPairingState = {
      ...mockPairingState,
      product: { [Product.ATTR_VENDOR]: 'Arcus', [Product.ATTR_NAME]: 'Smart Plug' },
    };
    render(<PairingPage />);
    expect(screen.getByText('Pair Arcus Smart Plug')).toBeInTheDocument();
  });

  it('shows Product Catalog link', () => {
    render(<PairingPage />);
    expect(screen.getByText(/Product Catalog/)).toBeInTheDocument();
  });

  it('renders StageIndicator', () => {
    render(<PairingPage />);
    expect(screen.getByTestId('stage-indicator')).toBeInTheDocument();
  });
});

describe('PairingPage – stage rendering', () => {
  it('renders StepsStage when stage is steps', () => {
    render(<PairingPage />);
    expect(screen.getByTestId('steps-stage')).toBeInTheDocument();
  });

  it('renders SearchingStage when stage is searching', () => {
    mockPairingState = { ...mockPairingState, stage: 'searching' };
    render(<PairingPage />);
    expect(screen.getByTestId('searching-stage')).toBeInTheDocument();
  });

  it('renders CustomizeStage when stage is customize', () => {
    mockPairingState = { ...mockPairingState, stage: 'customize' };
    render(<PairingPage />);
    expect(screen.getByTestId('customize-stage')).toBeInTheDocument();
  });

  it('renders CompletedStage when stage is completed', () => {
    mockPairingState = { ...mockPairingState, stage: 'completed' };
    render(<PairingPage />);
    expect(screen.getByTestId('completed-stage')).toBeInTheDocument();
  });
});

describe('PairingPage – lifecycle', () => {
  it('dispatches resetPairing on mount', () => {
    render(<PairingPage />);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/resetPairing' });
  });

  it('dispatches resetPairing on unmount', () => {
    const { unmount } = render(<PairingPage />);
    mockDispatch.mockClear();
    unmount();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/resetPairing' });
  });

  it('loads product from sessionStorage when product is not in state', () => {
    const product = { [Product.ATTR_ID]: 'sensor1', [Product.ATTR_NAME]: 'Motion Sensor' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    // product is null in mockPairingState — product loads from sessionStorage
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ product, isHubPairing: false }),
    );
  });

  it('does not re-load product when already in state', () => {
    const product = { [Product.ATTR_ID]: 'sensor1', [Product.ATTR_NAME]: 'Motion Sensor', [Base.ATTR_ADDRESS]: 'SERV:product:sensor1' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    render(<PairingPage />);
    expect(mockLoadProduct).not.toHaveBeenCalled();
  });

  it('sets isHubPairing true for hub product dee001', () => {
    const product = { [Product.ATTR_ID]: 'dee001', [Product.ATTR_NAME]: 'Wi-Fi Smart Hub' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isHubPairing: true }),
    );
  });

  it('sets isHubPairing true for hub product dee000', () => {
    const product = { [Product.ATTR_ID]: 'dee000', [Product.ATTR_NAME]: 'Smart Hub' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isHubPairing: true }),
    );
  });

  it('calls StopSearching on unmount when pairing subsystem is available', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    const { unmount } = render(<PairingPage />);
    mockBridgeRequest.mockClear();
    unmount();

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      PairingSubsystem.CMD_STOPSEARCHING,
      pairingSubAddr,
      {},
    );
  });

  it('calls StopSearching on beforeunload when pairing subsystem is available', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    render(<PairingPage />);
    mockBridgeRequest.mockClear();
    window.dispatchEvent(new Event('beforeunload'));

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      PairingSubsystem.CMD_STOPSEARCHING,
      pairingSubAddr,
      {},
    );
  });

  it('removes beforeunload listener on unmount', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    const { unmount } = render(<PairingPage />);
    unmount();
    mockBridgeRequest.mockClear();

    window.dispatchEvent(new Event('beforeunload'));
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      PairingSubsystem.CMD_STOPSEARCHING,
      expect.any(String),
      expect.anything(),
    );
  });
});

describe('PairingPage – auto-start pairing', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';

  beforeEach(() => {
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
  });

  it('calls StartPairing with productAddress when product is selected from catalog', async () => {
    const product = {
      [Base.ATTR_ADDRESS]: 'SERV:product:c3c055',
      [Product.ATTR_ID]: 'c3c055',
      [Product.ATTR_NAME]: 'Smart Plug',
    };
    // Simulate product-catalog setting sessionStorage before navigating to /pairing
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    // Simulate loadProduct having populated the Redux state
    mockPairingState = { ...mockPairingState, product };
    mockBridgeRequest.mockResolvedValue({ steps: [] });

    render(<PairingPage />);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        PairingSubsystem.CMD_STARTPAIRING,
        pairingSubAddr,
        { productAddress: 'SERV:product:c3c055' },
      );
    });
  });

  it('loads product from sessionStorage and waits for state before starting pairing', () => {
    const product = {
      [Base.ATTR_ADDRESS]: 'SERV:product:c3c055',
      [Product.ATTR_ID]: 'c3c055',
      [Product.ATTR_NAME]: 'Smart Plug',
    };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    // product is NOT in mockPairingState yet — effect should load it and wait
    render(<PairingPage />);

    // Should dispatch loadProduct from sessionStorage
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ product, isHubPairing: false }),
    );
    // Should NOT start searching or pairing until product is in state
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      PairingSubsystem.CMD_SEARCH,
      expect.any(String),
      expect.anything(),
    );
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      PairingSubsystem.CMD_STARTPAIRING,
      expect.any(String),
      expect.anything(),
    );
  });

  it('calls Search for generic pairing when no product exists anywhere', async () => {
    mockBridgeRequest.mockResolvedValue({ devices: [] });
    // No product in sessionStorage, no product in state
    render(<PairingPage />);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        PairingSubsystem.CMD_SEARCH,
        pairingSubAddr,
        { productAddress: '' },
      );
    });
  });

  it('does not auto-start when pairing subsystem is unavailable', () => {
    mockSubsystems = {};
    mockPairingState = {
      ...mockPairingState,
      product: { [Base.ATTR_ADDRESS]: 'SERV:product:c3c055', [Product.ATTR_NAME]: 'Smart Plug' },
    };
    render(<PairingPage />);

    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('does not auto-start for hub pairing products', () => {
    mockPairingState = {
      ...mockPairingState,
      product: { [Base.ATTR_ADDRESS]: 'SERV:product:dee001', [Product.ATTR_NAME]: 'Smart Hub' },
      isHubPairing: true,
    };
    render(<PairingPage />);

    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      PairingSubsystem.CMD_STARTPAIRING,
      expect.any(String),
      expect.anything(),
    );
  });
});

describe('PairingPage – stage indicator', () => {
  it('passes current stage to StageIndicator', () => {
    mockPairingState = { ...mockPairingState, stage: 'searching' };
    render(<PairingPage />);
    expect(screen.getByTestId('stage-indicator')).toHaveTextContent('searching');
  });
});

describe('PairingPage – error handling', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';

  beforeEach(() => {
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
  });

  it('dispatches error notification when StartPairing fails', async () => {
    const product = {
      [Base.ATTR_ADDRESS]: 'SERV:product:c3c055',
      [Product.ATTR_ID]: 'c3c055',
      [Product.ATTR_NAME]: 'Smart Plug',
    };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    mockBridgeRequest.mockRejectedValue(new Error('Hub offline'));

    render(<PairingPage />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to start pairing. Check hub connection.' },
      });
    });
  });

  it('dispatches error notification when Search fails', async () => {
    // No product — triggers generic search path
    mockBridgeRequest.mockRejectedValue(new Error('Network error'));

    render(<PairingPage />);

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to search for devices.' },
      });
    });
  });

  it('logs warning when device poll fails but does not crash', async () => {
    jest.useFakeTimers();
    try {
      const warn = spyOnWarn();
      const pollError = new Error('Poll failed');
      let listCalls = 0;
      mockBridgeRequest.mockImplementation((command: string) => {
        if (command !== PairingSubsystem.CMD_LISTPAIRINGDEVICES) return Promise.resolve({});
        listCalls += 1;
        // The first ListPairingDevices is the flow snapshot; the polls after it fail.
        return listCalls === 1 ? Promise.resolve({ devices: [] }) : Promise.reject(pollError);
      });

      render(<PairingPage />);
      await settle();
      expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_SEARCH]);

      await nextPoll();
      expect(listCalls).toBe(2);
      expect(warn).toHaveBeenCalledWith('Pairing device poll failed:', pollError);

      // The search keeps polling after a failed poll
      await nextPoll();
      expect(listCalls).toBe(3);
      expect(screen.getByTestId('stage-indicator')).toBeInTheDocument();
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('dispatches error notification when hub name customization fails', async () => {
    mockHub = { id: 'SERV:hub-1:hub', [Base.ATTR_ADDRESS]: 'SERV:hub-1:hub' };
    mockPairingState = {
      ...mockPairingState,
      stage: 'customize',
      isHubPairing: true,
      deviceName: 'My Hub',
    };
    mockBridgeRequest.mockRejectedValue(new Error('SetAttributes failed'));

    render(<PairingPage />);

    // Trigger the onCustomize callback
    await capturedCustomizeProps.onCustomize();

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to set hub name.' },
      });
    });

    // Should still dispatch customizationComplete
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/customizationComplete' });
  });

  it('dispatches error notification when device customization fails', async () => {
    mockPairingState = {
      ...mockPairingState,
      stage: 'customize',
      isHubPairing: false,
      activeDevice: {
        [Base.ATTR_ADDRESS]: 'SERV:pairdev:1',
        [PairingDevice.ATTR_DEVICEADDRESS]: 'DRIV:dev:1',
      },
      deviceName: 'Living Room Plug',
      isFavorite: true,
    };
    mockBridgeRequest.mockRejectedValue(new Error('Customize failed'));

    render(<PairingPage />);

    await capturedCustomizeProps.onCustomize();

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to save device customization. You can rename the device later from the Devices page.' },
      });
    });

    // Should still dispatch customizationComplete
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/customizationComplete' });
  });

  it('navigates to /devices even when DismissAll fails on finish', async () => {
    mockPairingState = { ...mockPairingState, stage: 'completed' };
    mockBridgeRequest.mockRejectedValue(new Error('DismissAll failed'));

    render(<PairingPage />);

    await capturedCompletedProps.onFinish();

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/devices');
    });
  });
});

describe('PairingPage – choosing the device to customize', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';
  const contactSensor = makePairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);
  const motionSensorJoining = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRING);
  const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);

  beforeEach(() => {
    jest.useFakeTimers();
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('ignores a device that was already PAIRED when the pairing flow started', async () => {
    // Left over from an earlier session (or a previous "Pair Another") and never dismissed
    mockPlatform([
      [contactSensor], // snapshot at flow start
      [contactSensor], // poll 1
      [contactSensor, motionSensorJoining], // poll 2
      [contactSensor, motionSensor], // poll 3
    ]);

    render(<PairingPage />);
    await settle();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_SEARCH]);

    await nextPoll();
    await nextPoll();
    expect(devicePairedDispatches()).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      { type: 'pairing/devicePaired', payload: { device: motionSensor, defaultName: '' } },
    ]);
  });

  it('ignores a PAIRED device that has already been customized', async () => {
    const customized = makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRED, { [PairingDevice.ATTR_CUSTOMIZATIONS]: ['NAME'] });
    mockPlatform([
      [], // snapshot at flow start
      [customized], // poll 1
      [customized, motionSensor], // poll 2
    ]);

    render(<PairingPage />);
    await settle();

    await nextPoll();
    expect(devicePairedDispatches()).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: motionSensor }) }),
    ]);
  });

  it('snapshots before StartPairing, so a device that pairs during the steps is still customized', async () => {
    const product = {
      [Base.ATTR_ADDRESS]: 'SERV:product:motion',
      [Product.ATTR_ID]: 'motion',
      [Product.ATTR_NAME]: 'Motion Sensor',
    };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    mockPlatform(
      [
        [], // snapshot at flow start, before the hub enters pairing mode
        [motionSensor], // joined while the user was reading the steps
      ],
      { [PairingSubsystem.CMD_STARTPAIRING]: { steps: [{ id: 'step-1', order: 1, instructions: ['Pull the tab.'] }] } },
    );

    render(<PairingPage />);
    await settle();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_STARTPAIRING]);

    await act(async () => {
      await capturedStepsProps.onStartSearch();
    });
    // The search reuses the flow's snapshot rather than taking a new one
    expect(commandsSent()).toEqual([
      PairingSubsystem.CMD_LISTPAIRINGDEVICES,
      PairingSubsystem.CMD_STARTPAIRING,
      PairingSubsystem.CMD_SEARCH,
    ]);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: motionSensor }) }),
    ]);
  });

  it('reports a search failure when the flow snapshot cannot be taken', async () => {
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_LISTPAIRINGDEVICES
        ? Promise.reject(new Error('Hub offline'))
        : Promise.resolve({}));

    render(<PairingPage />);
    await settle();

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to search for devices.' },
    });
    // The search screen offers Try Again instead of spinning forever
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/searchFailed' });
    expect(commandsSent()).not.toContain(PairingSubsystem.CMD_SEARCH);
  });

  it('never customizes a KIT device as the product being paired', async () => {
    const kitMotion = (state: string) => makePairingDevice('kit-motion', state, { [Base.ATTR_TAGS]: [KIT_TAG] });
    const plug = makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRED);
    mockPlatform([
      [kitMotion(PairingDevice.PAIRINGSTATE_PAIRING)], // snapshot: the kit sensor is still waiting to join
      [kitMotion(PairingDevice.PAIRINGSTATE_PAIRED)], // poll 1: the kit sensor powers on first
      [kitMotion(PairingDevice.PAIRINGSTATE_PAIRED), plug], // poll 2
    ]);

    render(<PairingPage />);
    await settle();
    await nextPoll();
    expect(devicePairedDispatches()).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: plug }) }),
    ]);
  });

  it('does not end a new search on an improperly paired device left from before the flow', async () => {
    const pastMispair = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    mockPlatform([
      [pastMispair], // snapshot at flow start
      [pastMispair], // poll 1
      [pastMispair, motionSensor], // poll 2
    ]);

    render(<PairingPage />);
    await settle();
    await nextPoll();
    expect(dispatchesOf('pairing/deviceMispaired')).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: motionSensor }) }),
    ]);
  });

  it('ends the search on a device that pairs improperly during it, and stops polling', async () => {
    const lock = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    mockPlatform([[], [lock]]);

    render(<PairingPage />);
    await settle();
    await nextPoll();
    expect(dispatchesOf('pairing/deviceMispaired')).toEqual([{ type: 'pairing/deviceMispaired', payload: lock }]);

    const sent = commandsSent().length;
    await nextPoll();
    expect(commandsSent()).toHaveLength(sent);
  });

  it('does not time out a search that already found its device', async () => {
    mockPlatform([[], [motionSensor]]);

    render(<PairingPage />);
    await settle();
    await nextPoll();
    expect(devicePairedDispatches()).toHaveLength(1);

    await act(async () => {
      await jest.advanceTimersByTimeAsync(180000);
    });
    expect(dispatchesOf('pairing/searchTimedOut')).toHaveLength(0);
    expect(devicePairedDispatches()).toHaveLength(1);
  });

  it('times out a search that found nothing', async () => {
    mockPlatform([[]]);

    render(<PairingPage />);
    await settle();
    await act(async () => {
      await jest.advanceTimersByTimeAsync(180000);
    });
    expect(dispatchesOf('pairing/searchTimedOut')).toHaveLength(1);

    // Polling stops with the timeout
    const sent = commandsSent().length;
    await nextPoll();
    expect(commandsSent()).toHaveLength(sent);
  });

  it('shows the failed state when the Search request fails', async () => {
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_SEARCH
        ? Promise.reject(new Error('Hub offline'))
        : Promise.resolve({ devices: [] }));

    render(<PairingPage />);
    await settle();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/searchFailed' });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to search for devices.' },
    });
    // No poll is left running
    const sent = commandsSent().length;
    await nextPoll();
    expect(commandsSent()).toHaveLength(sent);
  });

  it('searches again from the failed state with Try Again', async () => {
    let listCalls = 0;
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command !== PairingSubsystem.CMD_LISTPAIRINGDEVICES) return Promise.resolve({});
      listCalls += 1;
      return listCalls === 1 ? Promise.reject(new Error('Hub offline')) : Promise.resolve({ devices: [] });
    });

    const { rerender } = render(<PairingPage />);
    await settle();
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/searchFailed' });

    mockPairingState = { ...mockPairingState, stage: 'searching', searchFailed: true };
    rerender(<PairingPage />);
    await act(async () => {
      await capturedSearchingProps.onStartSearch();
    });

    expect(commandsSent()).toEqual([
      PairingSubsystem.CMD_LISTPAIRINGDEVICES,
      PairingSubsystem.CMD_LISTPAIRINGDEVICES,
      PairingSubsystem.CMD_SEARCH,
    ]);
    expect(dispatchesOf('pairing/startSearch')).toHaveLength(2);
  });
});

describe('PairingPage – dismissing customized devices', () => {
  const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);
  const pairdevAddr = motionSensor[Base.ATTR_ADDRESS];
  const deviceAddr = motionSensor[PairingDevice.ATTR_DEVICEADDRESS];

  beforeEach(() => {
    mockPairingState = {
      ...mockPairingState,
      stage: 'customize',
      activeDevice: motionSensor,
      deviceName: 'Hallway Motion',
      isFavorite: true,
    };
  });

  it('customizes the newly paired device and then dismisses it', async () => {
    mockBridgeRequest.mockResolvedValue({});

    render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });

    expect(mockBridgeRequest.mock.calls).toEqual([
      [PairingDevice.CMD_CUSTOMIZE, pairdevAddr, {}],
      [Base.CMD_SETATTRIBUTES, deviceAddr, { [Device.ATTR_NAME]: 'Hallway Motion' }],
      [PairingDevice.CMD_ADDCUSTOMIZATION, pairdevAddr, { customization: 'NAME' }],
      [PairingDevice.CMD_ADDCUSTOMIZATION, pairdevAddr, { customization: 'FAVORITE' }],
      [PairingDevice.CMD_DISMISS, pairdevAddr, {}],
    ]);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/customizationComplete' });
  });

  it('does not dismiss when saving the customization fails', async () => {
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingDevice.CMD_ADDCUSTOMIZATION
        ? Promise.reject(new Error('AddCustomization failed'))
        : Promise.resolve({}));

    render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });

    expect(commandsSent()).not.toContain(PairingDevice.CMD_DISMISS);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ui/addNotification',
      payload: { type: 'error', message: 'Failed to save device customization. You can rename the device later from the Devices page.' },
    });
  });

  it('treats a failed Dismiss as non-fatal once the customization is saved', async () => {
    const warn = spyOnWarn();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingDevice.CMD_DISMISS
        ? Promise.reject(new Error('Dismiss failed'))
        : Promise.resolve({}));

    render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });

    expect(commandsSent()).toContain(PairingDevice.CMD_DISMISS);
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ui/addNotification' }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/customizationComplete' });
    await waitFor(() => expect(warn).toHaveBeenCalledWith('Failed to dismiss pairing device:', expect.any(Error)));
  });
});

describe('PairingPage – Pair Another', () => {
  const contactSensor = makePairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);

  it('dismisses the completed device and returns to the catalog', async () => {
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: contactSensor };
    sessionStorage.setItem('pairing:product', JSON.stringify({ [Product.ATTR_ID]: 'contact' }));
    mockBridgeRequest.mockResolvedValue({});

    render(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onPairAnother();
    });

    expect(mockBridgeRequest).toHaveBeenCalledWith(PairingDevice.CMD_DISMISS, contactSensor[Base.ATTR_ADDRESS], {});
    // DismissAll is reserved for leaving pairing (Go to Devices)
    expect(commandsSent()).not.toContain(PairingSubsystem.CMD_DISMISSALL);
    expect(sessionStorage.getItem('pairing:product')).toBeNull();
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });

  it('does not dismiss again a device already dismissed after customization', async () => {
    mockPairingState = {
      ...mockPairingState,
      stage: 'customize',
      activeDevice: contactSensor,
      deviceName: 'Front Door',
    };
    mockBridgeRequest.mockResolvedValue({});

    const { rerender } = render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });

    mockPairingState = { ...mockPairingState, stage: 'completed' };
    rerender(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onPairAnother();
    });

    expect(commandsSent().filter((c) => c === PairingDevice.CMD_DISMISS)).toHaveLength(1);
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });

  it('does not dismiss a mispaired device', async () => {
    const mispaired = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: mispaired };
    mockBridgeRequest.mockResolvedValue({});

    render(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onPairAnother();
    });

    expect(commandsSent()).not.toContain(PairingDevice.CMD_DISMISS);
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });

  it('still returns to the catalog when Dismiss fails', async () => {
    spyOnWarn();
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: contactSensor };
    mockBridgeRequest.mockRejectedValue(new Error('Dismiss failed'));

    render(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onPairAnother();
    });

    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });
});

describe('PairingPage – leaving while pairing starts', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';
  const product = {
    [Base.ATTR_ADDRESS]: 'SERV:product:plug',
    [Product.ATTR_ID]: 'plug',
    [Product.ATTR_NAME]: 'Smart Plug',
  };
  const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);

  beforeEach(() => {
    jest.useFakeTimers();
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  /** Let three minutes pass: every poll and the search timeout would have fired. */
  async function waitOutSearch() {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(180000);
    });
  }

  it('does not send StartPairing when the page unmounts during the flow snapshot', async () => {
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    const snapshot = deferred<{ devices: PairingDeviceData[] }>();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_LISTPAIRINGDEVICES ? snapshot.promise : Promise.resolve({ steps: [] }));

    const { unmount } = render(<PairingPage />);
    await settle();
    unmount();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_STOPSEARCHING]);

    snapshot.resolve({ devices: [] });
    await settle();
    await waitOutSearch();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_STOPSEARCHING]);
    expect(dispatchesOf('pairing/setSteps')).toHaveLength(0);
    expect(dispatchesOf('pairing/searchTimedOut')).toHaveLength(0);
  });

  it('does not send Search when the page unmounts during the flow snapshot', async () => {
    const snapshot = deferred<{ devices: PairingDeviceData[] }>();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_LISTPAIRINGDEVICES ? snapshot.promise : Promise.resolve({}));

    const { unmount } = render(<PairingPage />);
    await settle();
    unmount();

    snapshot.resolve({ devices: [] });
    await settle();
    await waitOutSearch();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_STOPSEARCHING]);
  });

  it('starts no flow when the page unmounts during the flow snapshot', async () => {
    const snapshot = deferred<{ devices: PairingDeviceData[] }>();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_LISTPAIRINGDEVICES ? snapshot.promise : Promise.resolve({}));

    const { unmount } = render(<PairingPage />);
    await settle();
    unmount();

    snapshot.resolve({ devices: [motionSensor] });
    await settle();
    // Nothing was started, so there is no flow for leaving pairing to end.
    expect(dispatchesOf('pairing/startPairingFlow')).toHaveLength(0);
  });

  it('does not search when the page unmounts while StartPairing is in flight', async () => {
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    const startPairing = deferred<{ steps: [] }>();
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command === PairingSubsystem.CMD_STARTPAIRING) return startPairing.promise;
      return Promise.resolve({ devices: [] });
    });

    const { unmount } = render(<PairingPage />);
    await settle();
    unmount();

    startPairing.resolve({ steps: [] });
    await settle();
    await waitOutSearch();
    expect(commandsSent()).toEqual([
      PairingSubsystem.CMD_LISTPAIRINGDEVICES,
      PairingSubsystem.CMD_STARTPAIRING,
      PairingSubsystem.CMD_STOPSEARCHING,
    ]);
    expect(dispatchesOf('pairing/setSteps')).toHaveLength(0);
  });

  it('starts no poll when the page unmounts while Search is in flight', async () => {
    const search = deferred();
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command === PairingSubsystem.CMD_SEARCH) return search.promise;
      return Promise.resolve({ devices: [] });
    });

    const { unmount } = render(<PairingPage />);
    await settle();
    unmount();

    search.resolve({});
    await settle();
    await waitOutSearch();
    expect(commandsSent()).toEqual([
      PairingSubsystem.CMD_LISTPAIRINGDEVICES,
      PairingSubsystem.CMD_SEARCH,
      PairingSubsystem.CMD_STOPSEARCHING,
    ]);
    expect(dispatchesOf('pairing/searchTimedOut')).toHaveLength(0);
  });

  it('stops polling and cancels the search timeout on unmount', async () => {
    mockPlatform([[]]);

    const { unmount } = render(<PairingPage />);
    await settle();
    await nextPoll();
    const sent = commandsSent().length;
    unmount();

    await waitOutSearch();
    expect(commandsSent().slice(sent)).toEqual([PairingSubsystem.CMD_STOPSEARCHING]);
    expect(dispatchesOf('pairing/searchTimedOut')).toHaveLength(0);
  });

  it('drops a poll that finishes after the page unmounted', async () => {
    const poll = deferred<{ devices: PairingDeviceData[] }>();
    let listCalls = 0;
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command !== PairingSubsystem.CMD_LISTPAIRINGDEVICES) return Promise.resolve({});
      listCalls += 1;
      return listCalls === 1 ? Promise.resolve({ devices: [] }) : poll.promise;
    });

    const { unmount } = render(<PairingPage />);
    await settle();
    await nextPoll(); // this poll is still waiting for its answer
    unmount();

    poll.resolve({ devices: [motionSensor] });
    await settle();
    expect(dispatchesOf('pairing/setDevices')).toHaveLength(0);
    expect(devicePairedDispatches()).toHaveLength(0);
  });
});

describe('PairingPage – one snapshot per pairing flow', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';
  const contactSensor = makePairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);
  const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);

  beforeEach(() => {
    jest.useFakeTimers();
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('starts the flow from the snapshot', async () => {
    const pastMispair = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    const joining = makePairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRING);
    mockPlatform([[contactSensor, pastMispair, joining]]);

    render(<PairingPage />);
    await settle();

    expect(dispatchesOf('pairing/startPairingFlow')).toEqual([{
      type: 'pairing/startPairingFlow',
      payload: {
        pairingSubsystem: pairingSubAddr,
        settled: {
          [contactSensor[Base.ATTR_ADDRESS]]: PairingDevice.PAIRINGSTATE_PAIRED,
          [pastMispair[Base.ATTR_ADDRESS]]: PairingDevice.PAIRINGSTATE_MISPAIRED,
        },
      },
    }]);
  });

  it('reuses the flow after Pair Another, so a second device from the same search is customized', async () => {
    // The flow started with an empty list. Its first search paired the contact
    // sensor, which was customized, and the motion sensor, which joined too.
    const flow: PairingFlow = {
      pairingSubsystem: pairingSubAddr,
      settled: { [contactSensor[Base.ATTR_ADDRESS]]: PairingDevice.PAIRINGSTATE_PAIRED },
    };
    mockPairingState = { ...mockPairingState, flow };
    mockPlatform([[contactSensor, motionSensor]]);

    render(<PairingPage />);
    await settle();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_SEARCH]);
    expect(dispatchesOf('pairing/startPairingFlow')).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: motionSensor }) }),
    ]);
  });

  it('reuses the flow when StartPairing runs again for a product from the catalog', async () => {
    const product = { [Base.ATTR_ADDRESS]: 'SERV:product:lock', [Product.ATTR_ID]: 'lock', [Product.ATTR_NAME]: 'Lock' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product, flow: newPairingFlow(pairingSubAddr, []) };
    mockPlatform([[]], { [PairingSubsystem.CMD_STARTPAIRING]: { steps: [{ id: 's1', order: 1, instructions: ['x'] }] } });

    render(<PairingPage />);
    await settle();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_STARTPAIRING]);
  });

  it('does not end the next search in the flow on a device the flow already reported as mispaired', async () => {
    const lock = makePairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
    mockPairingState = {
      ...mockPairingState,
      flow: { pairingSubsystem: pairingSubAddr, settled: { [lock[Base.ATTR_ADDRESS]]: PairingDevice.PAIRINGSTATE_MISPAIRED } },
    };
    mockPlatform([[lock], [lock], [lock, motionSensor]]);

    render(<PairingPage />);
    await settle();
    await nextPoll();
    await nextPoll();
    expect(dispatchesOf('pairing/deviceMispaired')).toHaveLength(0);

    await nextPoll();
    expect(devicePairedDispatches()).toEqual([
      expect.objectContaining({ payload: expect.objectContaining({ device: motionSensor }) }),
    ]);
  });

  it('takes a new snapshot when the flow belongs to another place', async () => {
    mockPairingState = {
      ...mockPairingState,
      flow: { pairingSubsystem: 'SERV:subpairing:other-place', settled: {} },
    };
    mockPlatform([[contactSensor]]);

    render(<PairingPage />);
    await settle();
    expect(commandsSent()).toEqual([PairingSubsystem.CMD_LISTPAIRINGDEVICES, PairingSubsystem.CMD_SEARCH]);
    expect(dispatchesOf('pairing/startPairingFlow')).toEqual([{
      type: 'pairing/startPairingFlow',
      payload: {
        pairingSubsystem: pairingSubAddr,
        settled: { [contactSensor[Base.ATTR_ADDRESS]]: PairingDevice.PAIRINGSTATE_PAIRED },
      },
    }]);

    // This place's leftover is ignored
    await nextPoll();
    expect(devicePairedDispatches()).toHaveLength(0);
  });

  it.each([
    ['succeeds', () => Promise.resolve({})],
    ['fails', () => Promise.reject(new Error('DismissAll failed'))],
  ])('ends the flow on Go to Devices when DismissAll %s', async (_outcome, dismissAll) => {
    mockPairingState = { ...mockPairingState, stage: 'completed', flow: newPairingFlow(pairingSubAddr, []) };
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_DISMISSALL ? dismissAll() : Promise.resolve({}));

    render(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onFinish();
    });

    expect(commandsSent()).toEqual([PairingSubsystem.CMD_DISMISSALL]);
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/endPairingFlow' });
    expect(mockPush).toHaveBeenCalledWith('/devices');
  });
});

describe('PairingPage – search screen devices', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';
  const leftoverPlug = makePairingDevice('leftover-plug', PairingDevice.PAIRINGSTATE_PAIRED);
  const pastMispair = makePairingDevice('past-lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
  const kitMotion = makePairingDevice('kit-motion', PairingDevice.PAIRINGSTATE_PAIRING, { [Base.ATTR_TAGS]: [KIT_TAG] });
  const customized = makePairingDevice('other', PairingDevice.PAIRINGSTATE_PAIRED, { [PairingDevice.ATTR_CUSTOMIZATIONS]: ['NAME'] });
  const joining = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRING);
  const pairingList = [leftoverPlug, pastMispair, kitMotion, customized, joining];

  beforeEach(() => {
    mockSubsystems = {
      [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr },
    };
    // Keep the page from starting its own search
    mockBridgeRequest.mockReturnValue(new Promise(() => {}));
  });

  it("lists only this search's devices, plus earlier improperly paired ones", () => {
    mockPairingState = {
      ...mockPairingState,
      stage: 'searching',
      devices: pairingList,
      flow: newPairingFlow(pairingSubAddr, [leftoverPlug, pastMispair]),
    };
    render(<PairingPage />);

    expect(capturedSearchingProps.devices).toEqual([joining]);
    expect(capturedSearchingProps.earlierDevices).toEqual([pastMispair]);
  });

  it('lists nothing before the flow has started', () => {
    mockPairingState = { ...mockPairingState, stage: 'searching', devices: pairingList };
    render(<PairingPage />);

    expect(capturedSearchingProps.devices).toEqual([]);
    expect(capturedSearchingProps.earlierDevices).toEqual([]);
  });

  it('passes the failed state through', () => {
    mockPairingState = { ...mockPairingState, stage: 'searching', searchFailed: true };
    render(<PairingPage />);
    expect(capturedSearchingProps.searchFailed).toBe(true);
  });
});

describe('PairingPage – one action at a time', () => {
  const motionSensor = makePairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);
  const pairdevAddr = motionSensor[Base.ATTR_ADDRESS];
  const never = () => new Promise(() => {});

  function dismissesSent() {
    return commandsSent().filter((c) => c === PairingDevice.CMD_DISMISS);
  }

  it('saves once when Save & Finish is clicked twice, and is disabled while saving', async () => {
    mockPairingState = { ...mockPairingState, stage: 'customize', activeDevice: motionSensor, deviceName: 'Hall' };
    const customize = deferred();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingDevice.CMD_CUSTOMIZE ? customize.promise : Promise.resolve({}));

    render(<PairingPage />);
    expect(capturedCustomizeProps.saving).toBe(false);

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    act(() => {
      first = capturedCustomizeProps.onCustomize();
      second = capturedCustomizeProps.onCustomize();
    });
    expect(capturedCustomizeProps.saving).toBe(true);

    customize.resolve({});
    await act(async () => {
      await Promise.all([first, second]);
    });

    expect(commandsSent().filter((c) => c === PairingDevice.CMD_CUSTOMIZE)).toHaveLength(1);
    expect(dismissesSent()).toHaveLength(1);
    expect(dispatchesOf('pairing/customizationComplete')).toHaveLength(1);
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ui/addNotification' }));
    expect(capturedCustomizeProps.saving).toBe(false);
  });

  it('completes the customization without waiting for Dismiss', async () => {
    mockPairingState = { ...mockPairingState, stage: 'customize', activeDevice: motionSensor, deviceName: 'Hall' };
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingDevice.CMD_DISMISS ? never() : Promise.resolve({}));

    render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });

    expect(mockBridgeRequest).toHaveBeenCalledWith(PairingDevice.CMD_DISMISS, pairdevAddr, {});
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/customizationComplete' });
  });

  it('returns to the catalog without waiting for Dismiss, and dismisses once when clicked twice', () => {
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: motionSensor };
    mockBridgeRequest.mockImplementation(never);

    render(<PairingPage />);
    act(() => {
      capturedCompletedProps.onPairAnother();
      capturedCompletedProps.onPairAnother();
    });

    expect(dismissesSent()).toHaveLength(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
    expect(capturedCompletedProps.busy).toBe(true);
  });

  it('ignores Pair Another while Go to Devices is finishing', async () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { id: pairingSubAddr, [Base.ATTR_ADDRESS]: pairingSubAddr } };
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: motionSensor };
    const dismissAll = deferred();
    mockBridgeRequest.mockImplementation((command: string) =>
      command === PairingSubsystem.CMD_DISMISSALL ? dismissAll.promise : Promise.resolve({}));

    render(<PairingPage />);
    let finish: Promise<void> = Promise.resolve();
    act(() => {
      finish = capturedCompletedProps.onFinish();
    });
    expect(capturedCompletedProps.busy).toBe(true);
    act(() => {
      capturedCompletedProps.onPairAnother();
    });
    expect(dismissesSent()).toHaveLength(0);
    expect(mockPush).not.toHaveBeenCalled();

    dismissAll.resolve({});
    await act(async () => {
      await finish;
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/devices');
  });

  it('lets Pair Another retry a Dismiss that failed after customizing', async () => {
    const warn = spyOnWarn();
    mockPairingState = { ...mockPairingState, stage: 'customize', activeDevice: motionSensor, deviceName: 'Hall' };
    let dismissCalls = 0;
    mockBridgeRequest.mockImplementation((command: string) => {
      if (command !== PairingDevice.CMD_DISMISS) return Promise.resolve({});
      dismissCalls += 1;
      return dismissCalls === 1 ? Promise.reject(new Error('Dismiss failed')) : Promise.resolve({});
    });

    const { rerender } = render(<PairingPage />);
    await act(async () => {
      await capturedCustomizeProps.onCustomize();
    });
    await waitFor(() => expect(warn).toHaveBeenCalledWith('Failed to dismiss pairing device:', expect.any(Error)));

    mockPairingState = { ...mockPairingState, stage: 'completed' };
    rerender(<PairingPage />);
    act(() => {
      capturedCompletedProps.onPairAnother();
    });
    expect(dismissesSent()).toHaveLength(2);
  });
});
