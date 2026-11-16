import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaterSoftener } from '@arcus/core';
import { WaterSoftenerRechargeTimeConfigurator } from '@/components/devices/WaterSoftenerRechargeTimeConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSetAttribute = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ setAttribute: mockSetAttribute }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:softener';
const ERROR = {
  type: 'ui/addNotification',
  payload: { type: 'error', message: 'Failed to update the recharge time' },
};

function makeSoftener(hour?: number): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(hour !== undefined && { [WaterSoftener.ATTR_RECHARGESTARTTIME]: hour }),
  });
}

const select = () => screen.getByLabelText('Recharge Time') as HTMLSelectElement;

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue({});
  mockDevice = makeSoftener(2);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('WaterSoftenerRechargeTimeConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<WaterSoftenerRechargeTimeConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('selects the current recharge hour', () => {
      render(<WaterSoftenerRechargeTimeConfigurator address={ADDRESS} />);
      expect(select().value).toBe('2');
      expect(screen.getByRole('option', { name: '2:00 AM' })).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(24);
    });

    it('shows a placeholder when no hour is reported', () => {
      mockDevice = makeSoftener(undefined);
      render(<WaterSoftenerRechargeTimeConfigurator address={ADDRESS} />);
      expect(select().value).toBe('');
      expect(screen.getByRole('option', { name: 'Choose a time' })).toBeDisabled();
    });
  });

  describe('interactions', () => {
    it('saves the chosen hour', async () => {
      render(<WaterSoftenerRechargeTimeConfigurator address={ADDRESS} />);
      fireEvent.change(select(), { target: { value: '23' } });
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(WaterSoftener.ATTR_RECHARGESTARTTIME, 23));
      await waitFor(() => expect(select()).toBeEnabled());
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('notifies when saving fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<WaterSoftenerRechargeTimeConfigurator address={ADDRESS} />);
      fireEvent.change(select(), { target: { value: '0' } });
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      await waitFor(() => expect(select()).toBeEnabled());
    });
  });
});
