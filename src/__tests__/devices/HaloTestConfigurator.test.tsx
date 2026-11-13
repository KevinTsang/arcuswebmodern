import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Halo, Test } from '@arcus/core';
import HaloTestConfigurator, { HALO_TEST_TIMEOUT_MS } from '@/components/devices/HaloTestConfigurator';
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
  useDeviceActions: () => ({ setAttribute: jest.fn(), sendCommand: mockSendCommand }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:halo';
const TESTED_AT = Date.UTC(2026, 0, 5, 15, 30);

function button() {
  return screen.getByTestId('halo-test-now');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendCommand.mockResolvedValue({});
  mockDevice = makeDevice(ADDRESS, {
    [Test.ATTR_LASTTESTTIME]: TESTED_AT,
    [Halo.ATTR_REMOTETESTRESULT]: Halo.REMOTETESTRESULT_SUCCESS,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HaloTestConfigurator', () => {
  it('matches snapshot', () => {
    // No test time, so the snapshot does not depend on the machine's time zone
    mockDevice = makeDevice(ADDRESS);
    const { asFragment } = render(<HaloTestConfigurator address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the last test time and result', () => {
      render(<HaloTestConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('halo-test-last')).toHaveTextContent(/, Success$/);
      expect(screen.getByTestId('halo-test-last')).toHaveClass('text-coot');
      expect(button()).toHaveTextContent('Test Now');
    });

    it('highlights a failed test', () => {
      mockDevice = makeDevice(ADDRESS, {
        [Test.ATTR_LASTTESTTIME]: TESTED_AT,
        [Halo.ATTR_REMOTETESTRESULT]: Halo.REMOTETESTRESULT_FAIL_CO_SENSOR,
      });
      render(<HaloTestConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('halo-test-last')).toHaveTextContent(/, Fail Co Sensor$/);
      expect(screen.getByTestId('halo-test-last')).toHaveClass('text-cardinal');
    });
  });

  describe('interactions', () => {
    it('starts a test and stays "Testing" until a new test time arrives', async () => {
      const { rerender } = render(<HaloTestConfigurator address={ADDRESS} />);
      fireEvent.click(button());
      expect(mockSendCommand).toHaveBeenCalledWith(Halo.CMD_STARTTEST, {});
      await waitFor(() => expect(mockSendCommand).toHaveBeenCalled());
      expect(button()).toHaveTextContent('Testing...');
      expect(button()).toBeDisabled();

      mockDevice = makeDevice(ADDRESS, {
        [Test.ATTR_LASTTESTTIME]: TESTED_AT + 60_000,
        [Halo.ATTR_REMOTETESTRESULT]: Halo.REMOTETESTRESULT_SUCCESS,
      });
      rerender(<HaloTestConfigurator address={ADDRESS} />);
      expect(button()).toHaveTextContent('Test Now');
      expect(button()).toBeEnabled();
    });

    it('shows an error and re-enables the button when the test cannot start', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      render(<HaloTestConfigurator address={ADDRESS} />);
      fireEvent.click(button());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to start the Halo test' },
      }));
      expect(button()).toBeEnabled();
    });
  });

  describe('edge cases', () => {
    it('stops waiting after the timeout when no result arrives', async () => {
      jest.useFakeTimers();
      render(<HaloTestConfigurator address={ADDRESS} />);
      fireEvent.click(button());
      await act(async () => {});
      expect(button()).toBeDisabled();
      act(() => { jest.advanceTimersByTime(HALO_TEST_TIMEOUT_MS); });
      expect(button()).toBeEnabled();
    });

    it('says "Never tested" without a test time', () => {
      mockDevice = makeDevice(ADDRESS);
      render(<HaloTestConfigurator address={ADDRESS} />);
      expect(screen.getByTestId('halo-test-last')).toHaveTextContent('Never tested');
    });
  });
});
