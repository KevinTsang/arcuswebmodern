import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Product, PairingDevice } from '@arcus/core';
import KitActivatePage from '@/app/(authenticated)/kit-activate/page';
import { endPairingFlow } from '@/store/slices/pairingSlice';
import type { DeviceEntity, PairingProduct, SubsystemEntity } from '@/store/entityTypes';

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

let mockDevices: DeviceEntity[] = [];
let mockProducts: PairingProduct[] = [];
let mockSubsystems: Record<string, SubsystemEntity> = {};

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
      place: { products: mockProducts },
      subsystems: {
        entities: mockSubsystems,
        ids: Object.keys(mockSubsystems),
      },
    }),
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [];
  mockProducts = [];
  mockSubsystems = {};
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('KitActivatePage – no pairing subsystem', () => {
  it('shows loading when pairing subsystem is not found', () => {
    render(<KitActivatePage />);
    expect(screen.getByText('Loading kit information…')).toBeInTheDocument();
  });
});

describe('KitActivatePage – empty kit', () => {
  it('shows no kit devices message when kit is empty', async () => {
    mockSubsystems = {
      sub1: { id: 'sub1', [Base.ATTR_ADDRESS]: 'SERV:subpairing:place-1' },
    };
    mockBridgeRequest.mockResolvedValue({ kitInfo: [], devices: [] });
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('No kit devices found.')).toBeInTheDocument());
  });

  it('shows Go to Devices link when no kit devices', async () => {
    mockSubsystems = {
      sub1: { id: 'sub1', [Base.ATTR_ADDRESS]: 'SERV:subpairing:place-1' },
    };
    mockBridgeRequest.mockResolvedValue({ kitInfo: [], devices: [] });
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Go to Devices')).toBeInTheDocument());
  });

  it('navigates to devices when Go to Devices is clicked', async () => {
    mockSubsystems = {
      sub1: { id: 'sub1', [Base.ATTR_ADDRESS]: 'SERV:subpairing:place-1' },
    };
    mockBridgeRequest.mockResolvedValue({ kitInfo: [], devices: [] });
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Go to Devices')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Go to Devices'));
    expect(mockPush).toHaveBeenCalledWith('/devices');
  });
});

describe('KitActivatePage – with kit devices', () => {
  beforeEach(() => {
    mockSubsystems = {
      sub1: { id: 'sub1', [Base.ATTR_ADDRESS]: 'SERV:subpairing:place-1' },
    };
    mockProducts = [
      { [Product.ATTR_ID]: 'sensor1', [Base.ATTR_ADDRESS]: 'SERV:product:sensor1', [Product.ATTR_NAME]: 'Motion Sensor', [Product.ATTR_VENDOR]: 'Arcus', [Product.ATTR_HUBREQUIRED]: true },
    ];
    mockBridgeRequest.mockResolvedValue({
      kitInfo: [
        { productId: 'sensor1', protocolAddress: 'ZIGB:proto1' },
        { productId: 'lock1', protocolAddress: 'ZWAVE:proto2' },
      ],
      devices: [
        {
          [Base.ATTR_ADDRESS]: 'DRIV:dev:pd1',
          [PairingDevice.ATTR_PAIRINGSTATE]: 'PAIRING',
          'pairdev:protocolAddress': 'ZIGB:proto1',
        },
      ],
    });
  });

  it('shows Kit Activation heading', async () => {
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Kit Activation')).toBeInTheDocument());
  });

  it('shows device names from products', async () => {
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Motion Sensor')).toBeInTheDocument());
  });

  it('shows finish button', async () => {
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Finish Later')).toBeInTheDocument());
  });

  it('navigates to devices on finish', async () => {
    render(<KitActivatePage />);
    await waitFor(() => expect(screen.getByText('Finish Later')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Finish Later'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/devices'));
    // DismissAll ends pairing, so the pairing page's next search starts a new flow
    expect(mockDispatch).toHaveBeenCalledWith(endPairingFlow());
  });
});

describe('KitActivatePage – error handling', () => {
  it('dispatches error notification on load failure', async () => {
    mockSubsystems = {
      sub1: { id: 'sub1', [Base.ATTR_ADDRESS]: 'SERV:subpairing:place-1' },
    };
    mockBridgeRequest.mockRejectedValue(new Error('fail'));
    render(<KitActivatePage />);
    await waitFor(() =>
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ payload: expect.objectContaining({ type: 'error' }) }),
      ),
    );
  });
});
