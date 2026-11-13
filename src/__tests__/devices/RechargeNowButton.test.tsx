import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WaterSoftener } from '@arcus/core';
import { RechargeNowButton } from '@/components/devices/RechargeNowButton';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockSendCommand = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({ sendCommand: mockSendCommand }),
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
  payload: { type: 'error', message: 'Failed to start the water softener recharge' },
};

function makeSoftener(status?: string): DeviceEntity {
  return makeDevice(ADDRESS, {
    ...(status !== undefined && { [WaterSoftener.ATTR_RECHARGESTATUS]: status }),
  });
}

const button = () => screen.getByTestId(`water-softener-recharge-${ADDRESS}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockSendCommand.mockResolvedValue({});
  mockDevice = makeSoftener(WaterSoftener.RECHARGESTATUS_READY);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('RechargeNowButton', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<RechargeNowButton address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it.each([
      WaterSoftener.RECHARGESTATUS_READY,
      WaterSoftener.RECHARGESTATUS_RECHARGE_SCHEDULED,
    ])('offers "Recharge Now" when %s', (status) => {
      mockDevice = makeSoftener(status);
      render(<RechargeNowButton address={ADDRESS} />);
      expect(button()).toHaveTextContent('Recharge Now');
      expect(button()).toBeEnabled();
    });

    it('shows "Recharging" disabled while recharging', () => {
      mockDevice = makeSoftener(WaterSoftener.RECHARGESTATUS_RECHARGING);
      render(<RechargeNowButton address={ADDRESS} />);
      expect(button()).toHaveTextContent('Recharging');
      expect(button()).toBeDisabled();
    });

    it('stays usable when the device has not reported a status', () => {
      mockDevice = undefined;
      render(<RechargeNowButton address={ADDRESS} />);
      expect(button()).toBeEnabled();
    });
  });

  describe('interactions', () => {
    it('sends rechargeNow', async () => {
      render(<RechargeNowButton address={ADDRESS} />);
      fireEvent.click(button());
      await waitFor(() => expect(mockSendCommand).toHaveBeenCalledWith(WaterSoftener.CMD_RECHARGENOW));
      await waitFor(() => expect(button()).toBeEnabled());
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('disables the button while the request is pending', async () => {
      let resolve!: () => void;
      mockSendCommand.mockReturnValueOnce(new Promise<void>((r) => { resolve = r; }));
      render(<RechargeNowButton address={ADDRESS} />);
      fireEvent.click(button());
      await waitFor(() => expect(button()).toBeDisabled());
      expect(button()).toHaveTextContent('...');
      resolve();
      await waitFor(() => expect(button()).toHaveTextContent('Recharge Now'));
    });

    it('notifies when the recharge fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      render(<RechargeNowButton address={ADDRESS} />);
      fireEvent.click(button());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(ERROR));
      await waitFor(() => expect(button()).toBeEnabled());
    });
  });
});
