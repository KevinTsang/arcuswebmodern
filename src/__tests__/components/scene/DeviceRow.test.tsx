import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceRow } from '@/components/scene/DeviceRow';
import { SelectorType } from '@/components/scene/types';
import type { SelectorDef } from '@/components/scene/types';

// Mock Redux selector
let mockDevice: Record<string, unknown> | undefined;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (selector: (s: unknown) => unknown) =>
    selector({
      devices: {
        devices: mockDevice ? { 'DRIV:dev:abc': mockDevice } : {},
      },
    }),
}));

jest.mock('@/store/slices/devicesSlice', () => ({
  selectDeviceByAddress: (state: { devices: { devices: Record<string, unknown> } }, addr: string) =>
    state.devices.devices[addr],
}));

// Mock SceneDeviceConfigurator to keep tests focused
jest.mock('@/components/scene/SceneDeviceConfigurator', () => ({
  SceneDeviceConfigurator: ({ selectors }: { selectors: SelectorDef[] }) => (
    <div data-testid="configurator">selectors: {selectors.length}</div>
  ),
}));

let mockOnToggle: jest.Mock;
let mockOnValueChange: jest.Mock;

beforeEach(() => {
  mockOnToggle = jest.fn();
  mockOnValueChange = jest.fn();
  mockDevice = { 'dev:name': 'Living Room Light' };
});

const selectors: SelectorDef[] = [
  { type: SelectorType.BOOLEAN, name: 'switch' },
];

describe('DeviceRow', () => {
  it('renders device name from store', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={false}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.getByText('Living Room Light')).toBeInTheDocument();
  });

  it('falls back to device address when device not found', () => {
    mockDevice = undefined;
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={false}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.getByText('DRIV:dev:abc')).toBeInTheDocument();
  });

  it('renders toggle switch with correct aria-checked when disabled', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={false}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('renders toggle switch with correct aria-checked when enabled', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={true}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle when switch clicked', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={false}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('shows configurator when enabled and selectors exist', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={true}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.getByTestId('configurator')).toBeInTheDocument();
  });

  it('hides configurator when disabled', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={selectors}
        enabled={false}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.queryByTestId('configurator')).not.toBeInTheDocument();
  });

  it('hides configurator when selectors are empty', () => {
    render(
      <DeviceRow
        deviceAddr="DRIV:dev:abc"
        selectors={[]}
        enabled={true}
        values={{}}
        onToggle={mockOnToggle}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(screen.queryByTestId('configurator')).not.toBeInTheDocument();
  });
});
