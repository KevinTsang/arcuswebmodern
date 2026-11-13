import { render, screen } from '@testing-library/react';
import { WaterSoftener } from '@arcus/core';
import { WaterSaltConfigurator } from '@/components/devices/WaterSaltConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:softener';

function makeSoftener(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDRESS, {
    [WaterSoftener.ATTR_CURRENTSALTLEVEL]: 9,
    [WaterSoftener.ATTR_MAXSALTLEVEL]: 12,
    [WaterSoftener.ATTR_SALTLEVELENABLED]: true,
    ...overrides,
  });
}

beforeEach(() => {
  mockDevice = makeSoftener();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterSaltConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterSaltConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the salt level as a percentage and progress bar', () => {
    render(<WaterSaltConfigurator address={ADDRESS} />);
    expect(screen.getByTestId('water-salt-level')).toHaveTextContent('75%');
    expect(screen.getByRole('progressbar', { name: 'Salt level' })).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText(/nugget, pellet, or coarse solar salts/)).toBeInTheDocument();
  });

  it('explains when salt monitoring is disabled', () => {
    mockDevice = makeSoftener({ [WaterSoftener.ATTR_SALTLEVELENABLED]: false });
    render(<WaterSaltConfigurator address={ADDRESS} />);
    expect(screen.getByTestId('water-salt-level-disabled')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('omits the level when the device does not report one', () => {
    mockDevice = makeSoftener({ [WaterSoftener.ATTR_MAXSALTLEVEL]: undefined });
    render(<WaterSaltConfigurator address={ADDRESS} />);
    expect(screen.queryByTestId('water-salt-level')).not.toBeInTheDocument();
    expect(screen.getByText(/Recommended salt types/)).toBeInTheDocument();
  });
});
