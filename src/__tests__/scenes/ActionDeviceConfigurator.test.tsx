import { render, screen, fireEvent } from '@testing-library/react';
import { ActionDeviceConfigurator } from '@/components/scenes/ActionDeviceConfigurator';
import type { ResolvedAction, ActionConfig } from '@/components/scenes/ScenePanel';
import { SelectorType } from '@/components/scenes/types';

// Mock DeviceRow to avoid Redux dependency
jest.mock('@/components/scenes/DeviceRow', () => ({
  DeviceRow: ({ deviceAddr, enabled, onToggle, onValueChange }: {
    deviceAddr: string;
    enabled: boolean;
    onToggle: () => void;
    onValueChange: (key: string, value: unknown) => void;
  }) => (
    <div data-testid={`device-${deviceAddr}`}>
      <span>{deviceAddr}</span>
      <span>{enabled ? 'enabled' : 'disabled'}</span>
      <button onClick={onToggle}>toggle</button>
      <button onClick={() => onValueChange('dim', 50)}>change</button>
    </div>
  ),
}));

let mockOnBack: jest.Mock;
let mockOnToggleDevice: jest.Mock;
let mockOnDeviceValueChange: jest.Mock;

beforeEach(() => {
  mockOnBack = jest.fn();
  mockOnToggleDevice = jest.fn();
  mockOnDeviceValueChange = jest.fn();
});

const action: ResolvedAction = {
  id: 'action1',
  name: 'Lights',
  satisfiable: true,
  selectors: {
    'DRIV:dev:abc': [{ type: SelectorType.BOOLEAN, name: 'switch' }],
    'DRIV:dev:def': [{ type: SelectorType.PERCENT, name: 'dim', min: 0, max: 100 }],
  },
};

const emptyConfiguredActions = new Map<string, ActionConfig>();

const configuredActions = new Map<string, ActionConfig>([
  ['action1', { name: 'Lights', template: 'action1', context: { 'DRIV:dev:abc': { switch: true } } }],
]);

describe('ActionDeviceConfigurator', () => {
  it('renders action name', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    expect(screen.getByText('Lights')).toBeInTheDocument();
  });

  it('renders device rows for each device address', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    expect(screen.getByTestId('device-DRIV:dev:abc')).toBeInTheDocument();
    expect(screen.getByTestId('device-DRIV:dev:def')).toBeInTheDocument();
  });

  it('passes enabled=true for configured devices', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={configuredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    const abc = screen.getByTestId('device-DRIV:dev:abc');
    expect(abc).toHaveTextContent('enabled');
    const def = screen.getByTestId('device-DRIV:dev:def');
    expect(def).toHaveTextContent('disabled');
  });

  it('calls onBack when back button clicked', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    fireEvent.click(screen.getByText('← Back'));
    expect(mockOnBack).toHaveBeenCalled();
  });

  it('calls onToggleDevice when device toggle clicked', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    fireEvent.click(screen.getAllByText('toggle')[0]);
    expect(mockOnToggleDevice).toHaveBeenCalledWith(
      action,
      'DRIV:dev:abc',
      [{ type: SelectorType.BOOLEAN, name: 'switch' }],
    );
  });

  it('calls onDeviceValueChange when device value changes', () => {
    render(
      <ActionDeviceConfigurator
        action={action}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    fireEvent.click(screen.getAllByText('change')[0]);
    expect(mockOnDeviceValueChange).toHaveBeenCalledWith('action1', 'DRIV:dev:abc', 'dim', 50);
  });

  it('shows empty message when action has no devices', () => {
    const emptyAction: ResolvedAction = { ...action, selectors: {} };
    render(
      <ActionDeviceConfigurator
        action={emptyAction}
        configuredActions={emptyConfiguredActions}
        onBack={mockOnBack}
        onToggleDevice={mockOnToggleDevice}
        onDeviceValueChange={mockOnDeviceValueChange}
      />,
    );
    expect(screen.getByText('No devices available for this action.')).toBeInTheDocument();
  });
});
