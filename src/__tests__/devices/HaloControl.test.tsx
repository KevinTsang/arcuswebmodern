import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, DevicePower, WeatherRadio } from '@arcus/core';
import HaloControl from '@/components/devices/HaloControl';
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

jest.mock('@/components/devices/ToggleOnOff', () => ({
  __esModule: true,
  default: ({ address }: { address: string }) => <span data-testid={`device-toggle-${address}`} />,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const ADDRESS = 'DRIV:dev:halo';

function makeHalo(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDRESS, {
    [Base.ATTR_CAPS]: ['base', 'dev', 'halo', 'swit', WeatherRadio.NAMESPACE],
    [DevicePower.ATTR_SOURCE]: DevicePower.SOURCE_LINE,
    [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_QUIET,
    [WeatherRadio.ATTR_STATIONSELECTED]: 3,
    ...overrides,
  });
}

function radio() {
  return screen.getByTestId(`halo-radio-${ADDRESS}`);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendCommand.mockResolvedValue({});
  mockDevice = makeHalo();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('HaloControl', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<HaloControl address={ADDRESS} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('shows the light toggle and Play Radio on a plugged-in Halo Plus', () => {
      render(<HaloControl address={ADDRESS} />);
      expect(screen.getByTestId(`device-toggle-${ADDRESS}`)).toBeInTheDocument();
      expect(radio()).toHaveTextContent('Play Radio');
      expect(radio()).toHaveAttribute('aria-pressed', 'false');
    });

    it('offers Stop Radio while the radio is playing', () => {
      mockDevice = makeHalo({ [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_PLAYING });
      render(<HaloControl address={ADDRESS} />);
      expect(radio()).toHaveTextContent('Stop Radio');
    });

    it('shows only the light toggle on a Halo without a radio', () => {
      mockDevice = makeHalo({ [Base.ATTR_CAPS]: ['base', 'dev', 'halo', 'swit'] });
      render(<HaloControl address={ADDRESS} />);
      expect(screen.getByTestId(`device-toggle-${ADDRESS}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`halo-radio-${ADDRESS}`)).not.toBeInTheDocument();
    });

    it('shows "Light Disabled" on battery power', () => {
      mockDevice = makeHalo({ [DevicePower.ATTR_SOURCE]: DevicePower.SOURCE_BATTERY });
      render(<HaloControl address={ADDRESS} />);
      expect(screen.getByTestId(`halo-light-disabled-${ADDRESS}`)).toHaveTextContent('Light Disabled');
      expect(screen.queryByTestId(`device-toggle-${ADDRESS}`)).not.toBeInTheDocument();
      expect(screen.queryByTestId(`halo-radio-${ADDRESS}`)).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('plays the selected station until stopped', async () => {
      render(<HaloControl address={ADDRESS} />);
      fireEvent.click(radio());
      expect(radio()).toBeDisabled();
      expect(mockSendCommand).toHaveBeenCalledWith(WeatherRadio.CMD_PLAYSTATION, { station: 3, time: -1 });
      await waitFor(() => expect(radio()).toBeEnabled());
    });

    it('stops the radio', async () => {
      mockDevice = makeHalo({ [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_PLAYING });
      render(<HaloControl address={ADDRESS} />);
      fireEvent.click(radio());
      await waitFor(() => expect(mockSendCommand).toHaveBeenCalledWith(WeatherRadio.CMD_STOPPLAYINGSTATION, {}));
    });

    it('shows an error when play fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      render(<HaloControl address={ADDRESS} />);
      fireEvent.click(radio());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to play the weather radio' },
      }));
      expect(radio()).toBeEnabled();
    });

    it('shows an error when stop fails', async () => {
      mockSendCommand.mockRejectedValueOnce(new Error('fail'));
      mockDevice = makeHalo({ [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_PLAYING });
      render(<HaloControl address={ADDRESS} />);
      fireEvent.click(radio());
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to stop the weather radio' },
      }));
    });
  });

  describe('edge cases', () => {
    it('disables Play Radio when no station is selected', () => {
      mockDevice = makeHalo({ [WeatherRadio.ATTR_STATIONSELECTED]: undefined });
      render(<HaloControl address={ADDRESS} />);
      expect(radio()).toBeDisabled();
    });

    it('renders nothing without a device', () => {
      mockDevice = undefined;
      const { container } = render(<HaloControl address={ADDRESS} />);
      expect(container).toBeEmptyDOMElement();
    });
  });
});
