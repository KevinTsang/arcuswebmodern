import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MobileDevice, Person } from '@arcus/core';
import MobileDevicesCard from '@/components/settings/MobileDevicesCard';
import type { MobileDeviceData } from '@/components/settings/mobileDevices';

// ── Mocks ─────────────────────────────────────────────────────────────

const PERSON = 'SERV:person:p1';
const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const IPHONE: MobileDeviceData = {
  [MobileDevice.ATTR_DEVICEINDEX]: 1,
  [MobileDevice.ATTR_OSTYPE]: 'iOS',
  [MobileDevice.ATTR_OSVERSION]: '17.2',
  [MobileDevice.ATTR_FORMFACTOR]: 'phone',
  [MobileDevice.ATTR_DEVICEVENDOR]: 'Apple',
  [MobileDevice.ATTR_DEVICEMODEL]: 'iPhone 15',
  [MobileDevice.ATTR_APPVERSION]: '2.1.0',
};

const TABLET: MobileDeviceData = {
  [MobileDevice.ATTR_DEVICEINDEX]: 2,
  [MobileDevice.ATTR_NAME]: 'Kitchen Tablet',
  [MobileDevice.ATTR_OSTYPE]: 'Android',
  [MobileDevice.ATTR_FORMFACTOR]: 'tablet',
};

const REMOVED = { type: 'ui/addNotification', payload: { type: 'success', message: 'Mobile device removed.' } };
const REMOVE_ERROR = { type: 'ui/addNotification', payload: { type: 'error', message: 'Failed to remove mobile device.' } };

function respond(listResult: Promise<unknown>) {
  mockBridgeRequest.mockImplementation((cmd: string) =>
    cmd === Person.CMD_LISTMOBILEDEVICES ? listResult : Promise.resolve({}),
  );
}

let confirmSpy: jest.SpyInstance;

beforeEach(() => {
  jest.clearAllMocks();
  respond(Promise.resolve({ mobileDevices: [IPHONE, TABLET] }));
  confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  confirmSpy.mockRestore();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('MobileDevicesCard', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<MobileDevicesCard personAddress={PERSON} />);
    await screen.findByTestId('mobile-device-1');
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('lists the person\'s mobile devices', async () => {
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(await screen.findByText('Apple iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('iOS 17.2 · phone · App 2.1.0')).toBeInTheDocument();
      expect(screen.getByText('Kitchen Tablet')).toBeInTheDocument();
      expect(screen.getByText('Android · tablet')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_LISTMOBILEDEVICES, PERSON, {});
    });

    it('shows a loading state until the list arrives', () => {
      respond(new Promise(() => {}));
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(screen.getByTestId('mobile-devices-loading')).toBeInTheDocument();
    });

    it('shows an empty state when there are no devices', async () => {
      respond(Promise.resolve({ mobileDevices: [] }));
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(await screen.findByTestId('mobile-devices-empty')).toBeInTheDocument();
    });

    it('shows an error when the list cannot be loaded', async () => {
      respond(Promise.reject(new Error('fail')));
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(await screen.findByTestId('mobile-devices-error')).toBeInTheDocument();
    });
  });

  describe('removing a device', () => {
    it('removes the device and confirms success', async () => {
      render(<MobileDevicesCard personAddress={PERSON} />);
      fireEvent.click(await screen.findByTestId('mobile-device-remove-1'));
      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_REMOVEMOBILEDEVICE, PERSON, { deviceIndex: 1 }),
      );
      await waitFor(() => expect(screen.queryByTestId('mobile-device-1')).not.toBeInTheDocument());
      expect(screen.getByTestId('mobile-device-2')).toBeInTheDocument();
      expect(mockDispatch).toHaveBeenCalledWith(REMOVED);
    });

    it('keeps the device and shows an error when removal fails', async () => {
      mockBridgeRequest.mockImplementation((cmd: string) =>
        cmd === Person.CMD_LISTMOBILEDEVICES
          ? Promise.resolve({ mobileDevices: [IPHONE] })
          : Promise.reject(new Error('fail')),
      );
      render(<MobileDevicesCard personAddress={PERSON} />);
      fireEvent.click(await screen.findByTestId('mobile-device-remove-1'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(REMOVE_ERROR));
      expect(screen.getByTestId('mobile-device-1')).toBeInTheDocument();
      expect(screen.getByTestId('mobile-device-remove-1')).not.toBeDisabled();
    });

    it('does nothing when the confirmation is cancelled', async () => {
      confirmSpy.mockReturnValue(false);
      render(<MobileDevicesCard personAddress={PERSON} />);
      fireEvent.click(await screen.findByTestId('mobile-device-remove-1'));
      expect(mockBridgeRequest).not.toHaveBeenCalledWith(Person.CMD_REMOVEMOBILEDEVICE, expect.anything(), expect.anything());
      expect(screen.getByTestId('mobile-device-1')).toBeInTheDocument();
    });

    it('disables the row while removal is in progress', async () => {
      mockBridgeRequest.mockImplementation((cmd: string) =>
        cmd === Person.CMD_LISTMOBILEDEVICES
          ? Promise.resolve({ mobileDevices: [IPHONE] })
          : new Promise(() => {}),
      );
      render(<MobileDevicesCard personAddress={PERSON} />);
      fireEvent.click(await screen.findByTestId('mobile-device-remove-1'));
      await waitFor(() => expect(screen.getByTestId('mobile-device-remove-1')).toBeDisabled());
      expect(screen.getByText('Removing…')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('treats a response without mobileDevices as empty', async () => {
      respond(Promise.resolve({}));
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(await screen.findByTestId('mobile-devices-empty')).toBeInTheDocument();
    });

    it('falls back to the OS type or a generic title', async () => {
      respond(Promise.resolve({
        mobileDevices: [
          { [MobileDevice.ATTR_DEVICEINDEX]: 3, [MobileDevice.ATTR_OSTYPE]: 'Android' },
          { [MobileDevice.ATTR_DEVICEINDEX]: 4 },
        ],
      }));
      render(<MobileDevicesCard personAddress={PERSON} />);
      expect(await screen.findByTestId('mobile-device-3')).toHaveTextContent('Android');
      expect(screen.getByTestId('mobile-device-4')).toHaveTextContent('Mobile Device');
    });

    it('reloads when the person changes', async () => {
      const { rerender } = render(<MobileDevicesCard personAddress={PERSON} />);
      await screen.findByTestId('mobile-device-1');
      rerender(<MobileDevicesCard personAddress="SERV:person:p2" />);
      await waitFor(() =>
        expect(mockBridgeRequest).toHaveBeenCalledWith(Person.CMD_LISTMOBILEDEVICES, 'SERV:person:p2', {}),
      );
    });
  });
});
