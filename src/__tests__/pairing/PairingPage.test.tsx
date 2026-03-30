import { render, screen, waitFor } from '@testing-library/react';
import { Base, Product, PairingDevice, PairingSubsystem } from '@arcus/core';
import PairingPage from '@/app/(authenticated)/pairing/page';
import type { ArcusEntity, SubsystemEntity } from '@/store/entityTypes';
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
let capturedCustomizeProps: any = {};
let capturedCompletedProps: any = {};

jest.mock('@/components/pairing', () => ({
  StageIndicator: ({ stage }: any) => <div data-testid="stage-indicator">{stage}</div>,
  StepsStage: () => <div data-testid="steps-stage">StepsStage</div>,
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

beforeEach(() => {
  jest.clearAllMocks();
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
