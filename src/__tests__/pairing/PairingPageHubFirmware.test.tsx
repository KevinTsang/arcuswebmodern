import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Hub, Place, Product } from '@arcus/core';
import PairingPage from '@/app/(authenticated)/pairing/page';
import { HUB_REGISTRATION_ERRORS } from '@/arcus/types';
import { HUB_FIRMWARE_TIMEOUTS, HubFirmwareState } from '@/lib/hubFirmware';
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

jest.mock('@/store/slices/pairingSlice', () => ({
  loadProduct: (payload: unknown) => ({ type: 'pairing/loadProduct', payload }),
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
  setHubFirmwareProgress: (payload: unknown) => ({ type: 'pairing/setHubFirmwareProgress', payload }),
  hubRegistrationError: (payload: unknown) => ({ type: 'pairing/hubRegistrationError', payload }),
  customizationComplete: () => ({ type: 'pairing/customizationComplete' }),
  resetPairing: () => ({ type: 'pairing/resetPairing' }),
}));

let capturedStepsProps: { onStartHubRegistration: () => void } | null = null;
let capturedSearchingProps: { hubFirmwareProgress?: number } | null = null;

jest.mock('@/components/pairing', () => {
  const actual = jest.requireActual('@/components/pairing/HubFirmwareExitModal');
  return {
    StageIndicator: () => null,
    StepsStage: (props: { onStartHubRegistration: () => void }) => {
      capturedStepsProps = props;
      return <div data-testid="steps-stage" />;
    },
    SearchingStage: (props: { hubFirmwareProgress?: number }) => {
      capturedSearchingProps = props;
      return <div data-testid="searching-stage" />;
    },
    CustomizeStage: () => null,
    CompletedStage: () => null,
    HubFirmwareExitModal: actual.HubFirmwareExitModal,
  };
});

let mockPairingState: PairingState;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      hub: { hub: null },
      place: { placeId: 'place-1' },
      subsystems: { entities: {}, ids: [] },
      pairing: mockPairingState,
    }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const HUB_PRODUCT = { [Product.ATTR_ID]: 'dee001', [Product.ATTR_NAME]: 'Smart Hub' };

function hubPairingState(overrides: Partial<PairingState> = {}): PairingState {
  return {
    stage: 'steps',
    product: HUB_PRODUCT,
    isHubPairing: true,
    steps: [],
    currentStep: 0,
    loading: false,
    hubId: 'abc-1234',
    devices: [],
    activeDevice: null,
    searchTimedOut: false,
    hubRegistrationState: null,
    hubFirmwareProgress: 0,
    deviceName: '',
    isFavorite: false,
    ...overrides,
  };
}

const errorAction = (payload: string) => ({ type: 'pairing/hubRegistrationError', payload });
const progressAction = (payload: number) => ({ type: 'pairing/setHubFirmwareProgress', payload });

function startRegistration() {
  act(() => {
    // The handler returns a promise; the tests wait on the Bridge call instead.
    void capturedStepsProps!.onStartHubRegistration();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedStepsProps = null;
  capturedSearchingProps = null;
  mockPairingState = hubPairingState();
  mockBridgeRequest.mockResolvedValue({ state: 'OFFLINE', progress: 0 });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PairingPage – hub firmware during registration', () => {
  it('dispatches the firmware progress reported by RegisterHubV2', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ state: HubFirmwareState.DOWNLOADING, progress: 42.4 });
    render(<PairingPage />);
    startRegistration();

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(progressAction(42)));
    expect(mockBridgeRequest).toHaveBeenCalledWith(Place.CMD_REGISTERHUBV2, 'SERV:place:place-1', { hubId: 'ABC-1234' });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'pairing/setHubRegistrationState',
      payload: HubFirmwareState.DOWNLOADING,
    });
  });

  it('clamps out-of-range progress', async () => {
    mockBridgeRequest.mockResolvedValueOnce({ state: HubFirmwareState.APPLYING, progress: 140 });
    render(<PairingPage />);
    startRegistration();

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(progressAction(100)));
  });

  it('does not dispatch firmware progress outside the firmware states', async () => {
    render(<PairingPage />);
    startRegistration();

    await act(() => mockBridgeRequest.mock.results[0].value);
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pairing/setHubFirmwareProgress' }));
  });

  it('passes the stored firmware progress to SearchingStage', () => {
    mockPairingState = hubPairingState({
      stage: 'searching',
      hubRegistrationState: HubFirmwareState.DOWNLOADING,
      hubFirmwareProgress: 65,
    });
    render(<PairingPage />);
    expect(capturedSearchingProps?.hubFirmwareProgress).toBe(65);
  });

  it('stops polling when RegisterHubV2 reports a failed firmware upgrade', async () => {
    jest.useFakeTimers();
    mockBridgeRequest.mockResolvedValueOnce({ state: HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED, progress: 0 });
    render(<PairingPage />);
    startRegistration();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED)));
    await act(() => jest.advanceTimersByTimeAsync(20000));
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  it('stops polling when the platform rejects with a firmware upgrade error', async () => {
    jest.useFakeTimers();
    mockBridgeRequest.mockRejectedValueOnce({ code: HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED });
    render(<PairingPage />);
    startRegistration();

    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED)));
    await act(() => jest.advanceTimersByTimeAsync(20000));
    expect(mockBridgeRequest).toHaveBeenCalledTimes(1);
  });

  it('keeps polling after other request failures', async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockBridgeRequest.mockRejectedValueOnce(new Error('timeout'));
    render(<PairingPage />);
    startRegistration();

    await act(() => jest.advanceTimersByTimeAsync(5000));
    expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
    expect(mockDispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'pairing/hubRegistrationError' }));
    warn.mockRestore();
  });

  it('fails the update when the hub stays downloading past the timeout', async () => {
    jest.useFakeTimers();
    mockBridgeRequest.mockResolvedValue({ state: HubFirmwareState.DOWNLOADING, progress: 10 });
    render(<PairingPage />);
    startRegistration();

    await act(() => jest.advanceTimersByTimeAsync(HUB_FIRMWARE_TIMEOUTS.DOWNLOADING - 5000));
    expect(mockDispatch).not.toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED));

    await act(() => jest.advanceTimersByTimeAsync(5000));
    expect(mockDispatch).toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED));

    const calls = mockBridgeRequest.mock.calls.length;
    await act(() => jest.advanceTimersByTimeAsync(20000));
    expect(mockBridgeRequest).toHaveBeenCalledTimes(calls);
  });

  it('restarts the timeout when the hub moves from downloading to applying', async () => {
    jest.useFakeTimers();
    mockBridgeRequest.mockResolvedValue({ state: HubFirmwareState.DOWNLOADING, progress: 10 });
    render(<PairingPage />);
    startRegistration();

    await act(() => jest.advanceTimersByTimeAsync(HUB_FIRMWARE_TIMEOUTS.DOWNLOADING - 5000));
    mockBridgeRequest.mockResolvedValue({ state: HubFirmwareState.APPLYING, progress: 50 });
    // The next poll (5s later) sees APPLYING and starts its clock. Stay just
    // under the apply timeout from there: longer than the download timeout
    // overall, but no failure.
    await act(() => jest.advanceTimersByTimeAsync(HUB_FIRMWARE_TIMEOUTS.APPLYING));
    expect(mockDispatch).not.toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED));

    await act(() => jest.advanceTimersByTimeAsync(5000));
    expect(mockDispatch).toHaveBeenCalledWith(errorAction(HUB_REGISTRATION_ERRORS.FIRMWARE_UPDATE_FAILED));
  });

  it('stores the hub when registration completes after an update', async () => {
    const hub = { 'base:address': 'SERV:ABC-1234:hub', [Hub.ATTR_ID]: 'ABC-1234' };
    mockBridgeRequest.mockResolvedValueOnce({ state: Hub.REGISTRATIONSTATE_REGISTERED, progress: 100, hub });
    render(<PairingPage />);
    startRegistration();

    await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({ type: 'pairing/hubRegistered' }));
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'hub/setHub', payload: hub });
  });
});

describe('PairingPage – leaving during a firmware update', () => {
  it('matches snapshot with the exit warning open', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: HubFirmwareState.APPLYING });
    const { asFragment } = render(<PairingPage />);
    fireEvent.click(screen.getByTestId('pairing-back'));
    expect(asFragment()).toMatchSnapshot();
  });

  it('warns instead of leaving while the hub is downloading firmware', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: HubFirmwareState.DOWNLOADING });
    render(<PairingPage />);

    fireEvent.click(screen.getByTestId('pairing-back'));
    expect(screen.getByTestId('hub-firmware-exit-modal')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('closes the warning on Okay and stays on the page', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: HubFirmwareState.APPLYING });
    render(<PairingPage />);

    fireEvent.click(screen.getByTestId('pairing-back'));
    fireEvent.click(screen.getByTestId('hub-firmware-exit-ok'));
    expect(screen.queryByTestId('hub-firmware-exit-modal')).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('leaves normally when no firmware update is running', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: 'OFFLINE' });
    render(<PairingPage />);

    fireEvent.click(screen.getByTestId('pairing-back'));
    expect(screen.queryByTestId('hub-firmware-exit-modal')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/product-catalog');
  });

  it('asks the browser to confirm a reload during an update', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: HubFirmwareState.DOWNLOADING });
    render(<PairingPage />);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('does not block a reload when no update is running', () => {
    mockPairingState = hubPairingState({ stage: 'searching', hubRegistrationState: 'OFFLINE' });
    render(<PairingPage />);

    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });
});
