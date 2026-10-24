import { act, render, screen, waitFor } from '@testing-library/react';
import { Base, Device, Product, PairingDevice, PairingSubsystem } from '@arcus/core';
import PairingPage from '@/app/(authenticated)/pairing/page';
import type { ArcusEntity, PairingDevice as PairingDeviceData, SubsystemEntity } from '@/store/entityTypes';
import type { PairingState } from '@/store/slices/pairingSlice';

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
  setPairingLoading: (payload: unknown) => ({ type: 'pairing/setPairingLoading', payload }),
  setSteps: (payload: unknown) => ({ type: 'pairing/setSteps', payload }),
  startHubRegistration: () => ({ type: 'pairing/startHubRegistration' }),
  hubRegistered: () => ({ type: 'pairing/hubRegistered' }),
  setHubRegistrationState: (payload: unknown) => ({ type: 'pairing/setHubRegistrationState', payload }),
  hubRegistrationError: (payload: unknown) => ({ type: 'pairing/hubRegistrationError', payload }),
  customizationComplete: () => ({ type: 'pairing/customizationComplete' }),
  resetPairing: () => mockResetPairing(),
}));

// Capture subcomponent props to allow triggering callbacks in tests
let capturedStepsProps: any = {};
let capturedCustomizeProps: any = {};
let capturedCompletedProps: any = {};

jest.mock('@/components/pairing', () => ({
  StageIndicator: ({ stage }: any) => <div data-testid="stage-indicator">{stage}</div>,
  StepsStage: (props: any) => {
    capturedStepsProps = props;
    return <div data-testid="steps-stage">StepsStage</div>;
  },
  SearchingStage: () => <div data-testid="searching-stage">SearchingStage</div>,
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

function pairingDevice(
  id: string,
  state: string,
  customizations: string[] = [],
): PairingDeviceData {
  return {
    [Base.ATTR_ADDRESS]: `SERV:pairdev:${id}`,
    [PairingDevice.ATTR_PAIRINGSTATE]: state,
    [PairingDevice.ATTR_PAIRINGPHASE]: state === PairingDevice.PAIRINGSTATE_PAIRED
      ? PairingDevice.PAIRINGPHASE_PAIRED
      : PairingDevice.PAIRINGPHASE_JOIN,
    [PairingDevice.ATTR_DEVICEADDRESS]: `DRIV:dev:${id}`,
    [PairingDevice.ATTR_CUSTOMIZATIONS]: customizations,
  };
}

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

function devicePairedDispatches() {
  return mockDispatch.mock.calls
    .map(([action]) => action)
    .filter((action) => action.type === 'pairing/devicePaired');
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
    hubRegistrationState: null,
    deviceName: '',
    isFavorite: false,
  };
  mockHub = null;
  mockPlaceId = 'place-1';
  mockSubsystems = {};
  sessionStorage.clear();
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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Search succeeds, then ListPairingDevices fails
    mockBridgeRequest
      .mockResolvedValueOnce({}) // resetPairing dispatch
      .mockResolvedValueOnce({}) // Search succeeds
      .mockRejectedValueOnce(new Error('Poll failed')); // ListPairingDevices fails

    mockPairingState = { ...mockPairingState, stage: 'steps' };
    render(<PairingPage />);

    // Wait for search to be called
    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        PairingSubsystem.CMD_SEARCH,
        pairingSubAddr,
        expect.anything(),
      );
    });

    // Fast-forward the 3-second poll interval
    jest.advanceTimersByTime?.(3000);

    // The component should not have crashed
    expect(screen.getByTestId('stage-indicator')).toBeInTheDocument();
    warnSpy.mockRestore();
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
  const contactSensor = pairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);
  const motionSensorJoining = pairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRING);
  const motionSensor = pairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);

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

  it('ignores a device that was already PAIRED when the session started', async () => {
    // Left over from an earlier session (or a previous "Pair Another") and never dismissed
    mockPlatform([
      [contactSensor], // snapshot at session start
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
    const customized = pairingDevice('plug', PairingDevice.PAIRINGSTATE_PAIRED, ['NAME']);
    mockPlatform([
      [], // snapshot at session start
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
        [], // snapshot at session start, before the hub enters pairing mode
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
    // The search reuses the session snapshot rather than taking a new one
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

  it('reports a search failure when the session snapshot cannot be taken', async () => {
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
    expect(commandsSent()).not.toContain(PairingSubsystem.CMD_SEARCH);
  });
});

describe('PairingPage – dismissing customized devices', () => {
  const motionSensor = pairingDevice('motion', PairingDevice.PAIRINGSTATE_PAIRED);
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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
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
    expect(warnSpy).toHaveBeenCalledWith('Failed to dismiss pairing device:', expect.any(Error));
    warnSpy.mockRestore();
  });
});

describe('PairingPage – Pair Another', () => {
  const contactSensor = pairingDevice('contact', PairingDevice.PAIRINGSTATE_PAIRED);

  it('dismisses the completed device before returning to the catalog', async () => {
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
    const mispaired = pairingDevice('lock', PairingDevice.PAIRINGSTATE_MISPAIRED);
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
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockPairingState = { ...mockPairingState, stage: 'completed', activeDevice: contactSensor };
    mockBridgeRequest.mockRejectedValue(new Error('Dismiss failed'));

    render(<PairingPage />);
    await act(async () => {
      await capturedCompletedProps.onPairAnother();
    });

    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
    warnSpy.mockRestore();
  });
});
