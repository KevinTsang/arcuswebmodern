import { render, screen } from '@testing-library/react';
import { Device } from '@arcus/core';
import { DeviceConfigurationPanel } from '@/components/devices/DeviceConfigurationPanel';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: DeviceEntity | undefined;
let mockConfigurators: string[] = [];

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  useDeviceConfigurators: () => mockConfigurators,
}));

function stub(name: string) {
  return { __esModule: true, default: () => <div data-testid={`stub-${name}`} /> };
}

jest.mock('@/components/devices/PetDoorSmartKeysConfigurator', () => stub('petdoor-smartkeys'));
jest.mock('@/components/devices/HaloRoomConfigurator', () => stub('assign-halo-room'));
jest.mock('@/components/devices/HaloTestConfigurator', () => stub('test-halo'));
jest.mock('@/components/devices/ButtonAssignmentConfigurator', () => stub('assign-buttons'));
jest.mock('@/components/devices/PendantCoverageConfigurator', () => stub('test-coverage'));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:test';

beforeEach(() => {
  mockDevice = makeDevice(ADDRESS, { [Device.ATTR_NAME]: 'Back Door' });
  mockConfigurators = [];
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DeviceConfigurationPanel', () => {
  it('matches snapshot', () => {
    mockConfigurators = ['petdoor-smartkeys'];
    const { asFragment } = render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it.each(['petdoor-smartkeys', 'assign-halo-room', 'test-halo', 'assign-buttons', 'test-coverage'])(
    'renders the %s configurator',
    (type) => {
      mockConfigurators = [type];
      render(<DeviceConfigurationPanel address={ADDRESS} />);
      expect(screen.getByTestId(`stub-${type}`)).toBeInTheDocument();
      expect(screen.queryByText(/coming soon/)).not.toBeInTheDocument();
    },
  );

  it('shows the empty message without configurators', () => {
    render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(screen.getByTestId('config-empty')).toBeInTheDocument();
  });

  it('marks an unimplemented configurator as coming soon', () => {
    mockConfigurators = ['somfy-type'];
    render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(screen.getByText('somfy-type configurator (coming soon)')).toBeInTheDocument();
  });

  it('renders nothing without a device', () => {
    mockDevice = undefined;
    const { container } = render(<DeviceConfigurationPanel address={ADDRESS} />);
    expect(container).toBeEmptyDOMElement();
  });
});
