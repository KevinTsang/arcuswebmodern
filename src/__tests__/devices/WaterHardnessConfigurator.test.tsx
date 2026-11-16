import { render, screen } from '@testing-library/react';
import { WaterHardness } from '@arcus/core';
import { WaterHardnessConfigurator } from '@/components/devices/WaterHardnessConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:softener';

beforeEach(() => {
  mockDevice = makeDevice(ADDRESS, { [WaterHardness.ATTR_HARDNESS]: 15 });
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterHardnessConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterHardnessConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the reported hardness in grains per gallon', () => {
    render(<WaterHardnessConfigurator address={ADDRESS} />);
    expect(screen.getByText('Water Hardness Level')).toBeInTheDocument();
    expect(screen.getByTestId('water-hardness-value')).toHaveTextContent('15 gpg');
  });

  it('handles an unreported hardness', () => {
    mockDevice = makeDevice(ADDRESS);
    render(<WaterHardnessConfigurator address={ADDRESS} />);
    expect(screen.getByTestId('water-hardness-value')).toHaveTextContent('not reported');
  });

  it('offers no editable controls', () => {
    render(<WaterHardnessConfigurator address={ADDRESS} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
