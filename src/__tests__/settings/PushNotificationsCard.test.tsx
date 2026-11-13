import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileDevice, Person } from '@arcus/core';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import type { MobileDeviceData } from '@/components/settings/types';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const PERSON = 'SERV:person:p1';

const devices: MobileDeviceData[] = [
  {
    [MobileDevice.ATTR_DEVICEINDEX]: 1,
    [MobileDevice.ATTR_OSTYPE]: 'iOS',
    [MobileDevice.ATTR_OSVERSION]: '17.2',
    [MobileDevice.ATTR_DEVICEVENDOR]: 'Apple',
    [MobileDevice.ATTR_DEVICEMODEL]: 'iPhone 15',
  },
  {
    [MobileDevice.ATTR_DEVICEINDEX]: 2,
    [MobileDevice.ATTR_OSTYPE]: 'Android',
    [MobileDevice.ATTR_OSVERSION]: '14',
    [MobileDevice.ATTR_DEVICEVENDOR]: 'Google',
    [MobileDevice.ATTR_DEVICEMODEL]: 'Pixel 8',
  },
];

const errorToast = (message: string) => ({ type: 'ui/addNotification', payload: { type: 'error', message } });

beforeEach(() => {
  jest.clearAllMocks();
  mockBridgeRequest.mockImplementation((cmd: string) =>
    Promise.resolve(cmd === Person.CMD_LISTMOBILEDEVICES ? { mobileDevices: devices } : {}));
});

async function removeDevice(index: number) {
  fireEvent.click(await screen.findByTestId(`mobile-device-${index}-remove`));
  fireEvent.click(screen.getByTestId(`mobile-device-${index}-confirm`));
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('PushNotificationsCard', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<PushNotificationsCard personId="p1" />);
    await screen.findByTestId('push-devices-list');
    expect(asFragment()).toMatchSnapshot();
  });

  describe('loading', () => {
    it('shows a loading message, then the devices', async () => {
      render(<PushNotificationsCard personId="p1" />);
      expect(screen.getByTestId('push-devices-loading')).toBeInTheDocument();
      expect(await screen.findByText('iOS 17.2')).toBeInTheDocument();
      expect(screen.getByText('Android 14')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_LISTMOBILEDEVICES, PERSON, {});
    });

    it('shows an empty message with no devices', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ mobileDevices: [] });
      render(<PushNotificationsCard personId="p1" />);
      expect(await screen.findByTestId('push-devices-empty')).toBeInTheDocument();
    });

    it('treats a response without mobileDevices as empty', async () => {
      mockBridgeRequest.mockResolvedValueOnce({});
      render(<PushNotificationsCard personId="p1" />);
      expect(await screen.findByTestId('push-devices-empty')).toBeInTheDocument();
    });

    it('shows an error and toast when loading fails, and retries', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<PushNotificationsCard personId="p1" />);
      expect(await screen.findByTestId('push-devices-error')).toBeInTheDocument();
      expect(mockDispatch).toHaveBeenCalledWith(errorToast('Failed to load push notification devices.'));

      fireEvent.click(screen.getByTestId('push-devices-retry'));
      expect(await screen.findByTestId('push-devices-list')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('removing a device', () => {
    it('removes the device and shows a success toast', async () => {
      render(<PushNotificationsCard personId="p1" />);
      await removeDevice(1);

      await waitFor(() => expect(screen.queryByTestId('mobile-device-1')).not.toBeInTheDocument());
      expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_REMOVEMOBILEDEVICE, PERSON, { deviceIndex: 1 });
      expect(screen.getByTestId('mobile-device-2')).toBeInTheDocument();
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Device removed from push notifications.' },
      });
    });

    it('shows the empty message after removing the last device', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ mobileDevices: [devices[0]] });
      render(<PushNotificationsCard personId="p1" />);
      await removeDevice(1);
      expect(await screen.findByTestId('push-devices-empty')).toBeInTheDocument();
    });

    it('keeps the device and shows an error toast when removal fails', async () => {
      render(<PushNotificationsCard personId="p1" />);
      await screen.findByTestId('push-devices-list');
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      await removeDevice(2);

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(errorToast('Failed to remove device.')));
      expect(screen.getByTestId('mobile-device-2')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-device-2-remove')).not.toBeDisabled();
    });
  });
});
