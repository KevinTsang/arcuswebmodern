import { render, screen } from '@testing-library/react';
import DeviceSettingsConfigurator from '@/components/device/DeviceSettingsConfigurator';
import type { ParamDescriptor } from '@/components/device/device-settings/types';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: Record<string, unknown> | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/components/device/device-settings/ParamControl', () => ({
  ParamControl: ({ param }: { param: ParamDescriptor }) => (
    <div data-testid="param-control">{param.description}</div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const makeParams = (...descs: string[]): ParamDescriptor[] =>
  descs.map((d, i) => ({
    paramId: `p${i}`,
    name: `p${i}`,
    description: d,
    type: 'enum' as const,
    values: { '0': 'Off', '1': 'On' },
    dflt: 0,
  }));

beforeEach(() => {
  mockDevice = undefined;
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceSettingsConfigurator', () => {
  it('shows empty message when device has no params', () => {
    mockDevice = { 'devsettings:params': [] };
    render(<DeviceSettingsConfigurator address="DRIV:dev:d1" />);
    expect(screen.getByText('No advanced settings available.')).toBeInTheDocument();
  });

  it('shows empty message when device is undefined', () => {
    mockDevice = undefined;
    render(<DeviceSettingsConfigurator address="DRIV:dev:d1" />);
    expect(screen.getByText('No advanced settings available.')).toBeInTheDocument();
  });

  it('renders the Advanced Settings heading', () => {
    mockDevice = { 'devsettings:params': makeParams('LED indicator') };
    render(<DeviceSettingsConfigurator address="DRIV:dev:d1" />);
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
  });

  it('renders a ParamControl for each param', () => {
    mockDevice = {
      'devsettings:params': makeParams('LED indicator', 'Power failure', 'Auto timer'),
    };
    render(<DeviceSettingsConfigurator address="DRIV:dev:d1" />);
    const controls = screen.getAllByTestId('param-control');
    expect(controls).toHaveLength(3);
  });

  it('passes param descriptions through to ParamControl', () => {
    mockDevice = {
      'devsettings:params': makeParams('Parameter 1: Power failure', 'Parameter 5: LED indicator'),
    };
    render(<DeviceSettingsConfigurator address="DRIV:dev:d1" />);
    expect(screen.getByText('Parameter 1: Power failure')).toBeInTheDocument();
    expect(screen.getByText('Parameter 5: LED indicator')).toBeInTheDocument();
  });
});
