import { render, screen, waitFor } from '@testing-library/react';
import PairingPage from '@/app/(authenticated)/pairing/page';

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

// Mock subcomponents to isolate page tests
jest.mock('@/components/pairing', () => ({
  StageIndicator: ({ stage }: any) => <div data-testid="stage-indicator">{stage}</div>,
  StepsStage: () => <div data-testid="steps-stage">StepsStage</div>,
  SearchingStage: () => <div data-testid="searching-stage">SearchingStage</div>,
  CustomizeStage: () => <div data-testid="customize-stage">CustomizeStage</div>,
  CompletedStage: () => <div data-testid="completed-stage">CompletedStage</div>,
  PAIRING_STATES: {
    PAIRED: 'PAIRED',
    MISPAIRED: 'MISPAIRED',
    MISCONFIGURED: 'MISCONFIGURED',
  },
}));

let mockPairingState: Record<string, unknown>;
let mockHub: Record<string, unknown> | null = null;
let mockPlaceId: string | null = 'place-1';
let mockSubsystems: Record<string, Record<string, unknown>> = {};

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
      product: { 'product:vendor': 'Arcus', 'product:name': 'Smart Plug' },
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
    const product = { 'product:id': 'sensor1', 'product:name': 'Motion Sensor' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    // product is null in mockPairingState — product loads from sessionStorage
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ product, isHubPairing: false }),
    );
  });

  it('does not re-load product when already in state', () => {
    const product = { 'product:id': 'sensor1', 'product:name': 'Motion Sensor', 'base:address': 'SERV:product:sensor1' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    mockPairingState = { ...mockPairingState, product };
    render(<PairingPage />);
    expect(mockLoadProduct).not.toHaveBeenCalled();
  });

  it('sets isHubPairing true for hub product dee001', () => {
    const product = { 'product:id': 'dee001', 'product:name': 'Wi-Fi Smart Hub' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isHubPairing: true }),
    );
  });

  it('sets isHubPairing true for hub product dee000', () => {
    const product = { 'product:id': 'dee000', 'product:name': 'Smart Hub' };
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    render(<PairingPage />);
    expect(mockLoadProduct).toHaveBeenCalledWith(
      expect.objectContaining({ isHubPairing: true }),
    );
  });

  it('calls StopSearching on unmount when pairing subsystem is available', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { 'base:address': pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    const { unmount } = render(<PairingPage />);
    mockBridgeRequest.mockClear();
    unmount();

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      'subpairing:StopSearching',
      pairingSubAddr,
      {},
    );
  });

  it('calls StopSearching on beforeunload when pairing subsystem is available', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { 'base:address': pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    render(<PairingPage />);
    mockBridgeRequest.mockClear();
    window.dispatchEvent(new Event('beforeunload'));

    expect(mockBridgeRequest).toHaveBeenCalledWith(
      'subpairing:StopSearching',
      pairingSubAddr,
      {},
    );
  });

  it('removes beforeunload listener on unmount', () => {
    const pairingSubAddr = 'SERV:subpairing:place-1';
    mockSubsystems = { [pairingSubAddr]: { 'base:address': pairingSubAddr } };
    mockBridgeRequest.mockResolvedValue({});

    const { unmount } = render(<PairingPage />);
    unmount();
    mockBridgeRequest.mockClear();

    window.dispatchEvent(new Event('beforeunload'));
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      'subpairing:StopSearching',
      expect.any(String),
      expect.anything(),
    );
  });
});

describe('PairingPage – auto-start pairing', () => {
  const pairingSubAddr = 'SERV:subpairing:place-1';

  beforeEach(() => {
    mockSubsystems = {
      [pairingSubAddr]: { 'base:address': pairingSubAddr },
    };
  });

  it('calls StartPairing with productAddress when product is selected from catalog', async () => {
    const product = {
      'base:address': 'SERV:product:c3c055',
      'product:id': 'c3c055',
      'product:name': 'Smart Plug',
    };
    // Simulate product-catalog setting sessionStorage before navigating to /pairing
    sessionStorage.setItem('pairing:product', JSON.stringify(product));
    // Simulate loadProduct having populated the Redux state
    mockPairingState = { ...mockPairingState, product };
    mockBridgeRequest.mockResolvedValue({ steps: [] });

    render(<PairingPage />);

    await waitFor(() => {
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        'subpairing:StartPairing',
        pairingSubAddr,
        { productAddress: 'SERV:product:c3c055' },
      );
    });
  });

  it('loads product from sessionStorage and waits for state before starting pairing', () => {
    const product = {
      'base:address': 'SERV:product:c3c055',
      'product:id': 'c3c055',
      'product:name': 'Smart Plug',
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
      'subpairing:Search',
      expect.any(String),
      expect.anything(),
    );
    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      'subpairing:StartPairing',
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
        'subpairing:Search',
        pairingSubAddr,
        { productAddress: '' },
      );
    });
  });

  it('does not auto-start when pairing subsystem is unavailable', () => {
    mockSubsystems = {};
    mockPairingState = {
      ...mockPairingState,
      product: { 'base:address': 'SERV:product:c3c055', 'product:name': 'Smart Plug' },
    };
    render(<PairingPage />);

    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });

  it('does not auto-start for hub pairing products', () => {
    mockPairingState = {
      ...mockPairingState,
      product: { 'base:address': 'SERV:product:dee001', 'product:name': 'Smart Hub' },
      isHubPairing: true,
    };
    render(<PairingPage />);

    expect(mockBridgeRequest).not.toHaveBeenCalledWith(
      'subpairing:StartPairing',
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
