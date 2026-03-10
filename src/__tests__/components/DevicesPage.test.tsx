import { render, screen, fireEvent } from '@testing-library/react';
import DevicesPage from '@/app/(authenticated)/devices/page';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

let mockHub: Record<string, unknown> | null = null;
let mockDevices: Record<string, unknown>[] = [];
let mockSubsystems: { entities: Record<string, Record<string, unknown>> } | null = null;

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      place: { place: { 'place:name': 'Test Home' } },
      hub: { hub: mockHub },
      devices: { entities: Object.fromEntries(mockDevices.map((d, i) => [i, d])), ids: mockDevices.map((_, i) => i) },
      subsystems: mockSubsystems,
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: number) => state.devices.entities[id]),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/components/device', () => ({
  DeviceList: () => <div>DeviceList</div>,
  HubPanel: () => <div>HubPanel</div>,
  ZWaveTools: () => <div>ZWaveTools</div>,
}));

// ── Tests ─────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockHub = null;
  mockDevices = [];
  mockSubsystems = null;
});

describe('DevicesPage – No Devices Paired state', () => {
  it('shows "No Devices Paired" when no hub and no devices', () => {
    render(<DevicesPage />);
    expect(screen.getByText('No Devices Paired')).toBeInTheDocument();
  });

  it('shows both "Add a Hub or Smart Kit" and "Shop Devices" buttons', () => {
    render(<DevicesPage />);
    expect(screen.getByText('Add a Hub or Smart Kit')).toBeInTheDocument();
    expect(screen.getByText('Shop Devices')).toBeInTheDocument();
  });

  it('does not show the empty state when hub exists', () => {
    mockHub = { 'base:address': 'SERV:hub:hub-1' };
    render(<DevicesPage />);
    expect(screen.queryByText('No Devices Paired')).not.toBeInTheDocument();
    expect(screen.queryByText('Add a Hub or Smart Kit')).not.toBeInTheDocument();
    expect(screen.getByText('HubPanel')).toBeInTheDocument();
  });

  it('does not show the empty state when devices exist', () => {
    mockDevices = [{ 'base:address': 'DRIV:dev:dev-1', 'dev:name': 'Light' }];
    render(<DevicesPage />);
    expect(screen.queryByText('No Devices Paired')).not.toBeInTheDocument();
    expect(screen.getByText('DeviceList')).toBeInTheDocument();
  });

  it('does not show "+ Add Device" button when no hub', () => {
    render(<DevicesPage />);
    expect(screen.queryByText('+ Add Device')).not.toBeInTheDocument();
  });

  it('shows "+ Add Device" button when hub exists', () => {
    mockHub = { 'base:address': 'SERV:hub:hub-1' };
    render(<DevicesPage />);
    expect(screen.getByText('+ Add Device')).toBeInTheDocument();
  });
});

describe('DevicesPage – Add a Hub or Smart Kit button', () => {
  it('navigates to /hub-setup when clicked (no hub)', () => {
    render(<DevicesPage />);
    fireEvent.click(screen.getByText('Add a Hub or Smart Kit'));
    expect(mockPush).toHaveBeenCalledWith('/hub-setup');
  });

  it('navigates to /hub-setup when pairing subsystem is not found', () => {
    mockSubsystems = { entities: {} };
    render(<DevicesPage />);
    fireEvent.click(screen.getByText('Add a Hub or Smart Kit'));
    expect(mockPush).toHaveBeenCalledWith('/hub-setup');
  });

  it('does not call Bridge.request since hub is absent from empty state', () => {
    mockSubsystems = {
      entities: { sub1: { 'base:address': 'SERV:subpairing:place-1' } },
    };
    render(<DevicesPage />);
    fireEvent.click(screen.getByText('Add a Hub or Smart Kit'));
    expect(mockPush).toHaveBeenCalledWith('/hub-setup');
    expect(mockBridgeRequest).not.toHaveBeenCalled();
  });
});

describe('DevicesPage – Shop Devices link', () => {
  it('links to /product-catalog', () => {
    render(<DevicesPage />);
    const link = screen.getByText('Shop Devices');
    expect(link.closest('a')).toHaveAttribute('href', '/product-catalog');
  });
});

describe('DevicesPage – view toggle', () => {
  it('shows Z-Wave Tools when toggled', () => {
    render(<DevicesPage />);
    fireEvent.click(screen.getByText('Z-Wave Tools'));
    expect(screen.getByText('ZWaveTools')).toBeInTheDocument();
    expect(screen.queryByText('No Devices Paired')).not.toBeInTheDocument();
  });

  it('shows devices view by default', () => {
    render(<DevicesPage />);
    expect(screen.getByText('No Devices Paired')).toBeInTheDocument();
    expect(screen.queryByText('ZWaveTools')).not.toBeInTheDocument();
  });
});
