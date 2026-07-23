import { render, screen, waitFor } from '@testing-library/react';
import { DeviceList } from '@/components/devices/DeviceList';
import { Base, Device } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevices: DeviceEntity[] = [];
let mockDeviceParam: string | null = null;
const scrollIntoView = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => (key === 'device' ? mockDeviceParam : null) }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) =>
    sel({
      devices: {
        entities: Object.fromEntries(mockDevices.map((d, i) => [`d${i}`, d])),
        ids: mockDevices.map((_, i) => `d${i}`),
      },
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectAllDevices: (state: any) => state.devices.ids.map((id: string) => state.devices.entities[id]),
}));

// Stub DevicePanel — its internals are tested separately. Render the address
// so we can identify each row.
jest.mock('@/components/devices/DevicePanel', () => ({
  DevicePanel: ({ address }: { address: string }) => <div data-testid="panel">{address}</div>,
}));

function device(address: string, name: string): DeviceEntity {
  return { id: address, [Base.ATTR_ADDRESS]: address, [Device.ATTR_NAME]: name } as DeviceEntity;
}

beforeAll(() => {
  // jsdom does not implement scrollIntoView.
  window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockDevices = [];
  mockDeviceParam = null;
});

// A device row's wrapper carries `data-device-address` (a stable hook, not a
// structural selector) for scroll/highlight targeting.
function row(container: HTMLElement, address: string): HTMLElement | null {
  return container.querySelector(`[data-device-address="${address}"]`);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceList', () => {
  it('renders a panel for each device', () => {
    mockDevices = [device('DRIV:dev:a', 'A'), device('DRIV:dev:b', 'B')];
    render(<DeviceList />);
    expect(screen.getAllByTestId('panel')).toHaveLength(2);
  });

  it('shows an empty state when there are no devices', () => {
    render(<DeviceList />);
    expect(screen.getByText('No devices paired yet.')).toBeInTheDocument();
  });

  it('scrolls to and highlights the device named by the ?device param', async () => {
    mockDevices = [device('DRIV:dev:a', 'A'), device('DRIV:dev:b', 'B')];
    mockDeviceParam = 'DRIV:dev:b';
    const { container } = render(<DeviceList />);

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(row(container, 'DRIV:dev:b')?.className).toContain('ring-2');
    expect(row(container, 'DRIV:dev:a')?.className).not.toContain('ring-2');
  });

  it('does not highlight anything without a ?device param', () => {
    mockDevices = [device('DRIV:dev:a', 'A')];
    const { container } = render(<DeviceList />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(row(container, 'DRIV:dev:a')?.className).not.toContain('ring-2');
  });

  it('ignores a ?device param that matches no device', () => {
    mockDevices = [device('DRIV:dev:a', 'A')];
    mockDeviceParam = 'DRIV:dev:missing';
    const { container } = render(<DeviceList />);
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(row(container, 'DRIV:dev:a')?.className).not.toContain('ring-2');
  });
});
