import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { WeatherRadio } from '@arcus/core';
import NoaaRadioConfigurator, { PREVIEW_SECONDS } from '@/components/devices/NoaaRadioConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:radio';
const mockBridgeRequest = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: unknown[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const STATIONS = [
  { id: 1, freq: '162.400 MHz', rssi: 10 },
  { id: 2, freq: '162.425 MHz', rssi: 0 },
  { id: 3, freq: '162.450 MHz', rssi: '40.5' },
];

function error(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

async function scan() {
  fireEvent.click(screen.getByTestId('noaa-radio-scan'));
  await screen.findByTestId('noaa-station-1');
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDevice = makeDevice(ADDR, {
    [WeatherRadio.ATTR_STATIONSELECTED]: 3,
    [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_QUIET,
  });
  mockBridgeRequest.mockImplementation((cmd: string) =>
    Promise.resolve(cmd === WeatherRadio.CMD_SCANSTATIONS ? { stations: STATIONS } : {}),
  );
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('NoaaRadioConfigurator', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<NoaaRadioConfigurator address={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot after a scan', async () => {
    const { asFragment } = render(<NoaaRadioConfigurator address={ADDR} />);
    await scan();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the selected station and the scan button', () => {
    render(<NoaaRadioConfigurator address={ADDR} />);
    expect(screen.getByText('Emergency Weather Station')).toBeInTheDocument();
    expect(screen.getByTestId('noaa-radio-selected')).toHaveTextContent('Monitoring station 3');
    expect(screen.getByTestId('noaa-radio-scan')).toHaveTextContent('Scan for Stations');
  });

  describe('scanning', () => {
    it('lists audible stations strongest first', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();

      expect(mockBridgeRequest).toHaveBeenCalledWith(WeatherRadio.CMD_SCANSTATIONS, ADDR, {});
      expect(screen.queryByTestId('noaa-station-2')).not.toBeInTheDocument();
      const ids = screen.getAllByTestId(/^noaa-station-\d$/).map((el) => el.dataset.testid);
      expect(ids).toEqual(['noaa-station-3', 'noaa-station-1']);
      expect(screen.getByTestId('noaa-station-select-3')).toBeChecked();
      expect(screen.getByTestId('noaa-station-select-1')).not.toBeChecked();
      expect(screen.getByTestId('noaa-radio-scan')).toHaveTextContent('Rescan');
    });

    it('shows the in-flight state while scanning', async () => {
      mockBridgeRequest.mockReturnValueOnce(new Promise(() => {}));
      render(<NoaaRadioConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('noaa-radio-scan'));

      await waitFor(() => expect(screen.getByTestId('noaa-radio-scan')).toBeDisabled());
      expect(screen.getByTestId('noaa-radio-scan')).toHaveTextContent('Scanning…');
    });

    it('warns about a weak signal when no station is audible', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ stations: [{ id: 1, freq: 'x', rssi: 0 }] });
      render(<NoaaRadioConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('noaa-radio-scan'));

      expect(await screen.findByTestId('noaa-radio-weak-signal')).toHaveTextContent('Weak Radio Signal');
    });

    it('handles a response without stations', async () => {
      mockBridgeRequest.mockResolvedValueOnce({});
      render(<NoaaRadioConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('noaa-radio-scan'));

      expect(await screen.findByTestId('noaa-radio-weak-signal')).toBeInTheDocument();
    });

    it('shows an error when the scan fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<NoaaRadioConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('noaa-radio-scan'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to scan for weather radio stations')));
      expect(screen.getByTestId('noaa-radio-scan')).not.toBeDisabled();
    });
  });

  describe('previewing', () => {
    it('plays a station for the preview period, then resets', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      jest.useFakeTimers();

      fireEvent.click(screen.getByTestId('noaa-station-play-1'));
      expect(await screen.findByTestId('noaa-station-stop-1')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(
        WeatherRadio.CMD_PLAYSTATION, ADDR, { station: 1, time: PREVIEW_SECONDS },
      );

      act(() => { jest.advanceTimersByTime(PREVIEW_SECONDS * 1000); });
      expect(screen.getByTestId('noaa-station-play-1')).toBeInTheDocument();
    });

    it('shows an error when playing fails', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));

      fireEvent.click(screen.getByTestId('noaa-station-play-1'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to play weather radio station')));
      expect(screen.getByTestId('noaa-station-play-1')).toBeInTheDocument();
    });

    it('stops a playing preview', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      fireEvent.click(screen.getByTestId('noaa-station-play-1'));
      fireEvent.click(await screen.findByTestId('noaa-station-stop-1'));

      expect(await screen.findByTestId('noaa-station-play-1')).toBeInTheDocument();
      expect(mockBridgeRequest).toHaveBeenCalledWith(WeatherRadio.CMD_STOPPLAYINGSTATION, ADDR, {});
    });

    it('shows an error when stopping fails', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      fireEvent.click(screen.getByTestId('noaa-station-play-1'));
      const stop = await screen.findByTestId('noaa-station-stop-1');
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      fireEvent.click(stop);

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to stop weather radio')));
      expect(screen.getByTestId('noaa-station-stop-1')).toBeInTheDocument();
    });
  });

  describe('selecting a station', () => {
    it('sends SelectStation', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      fireEvent.click(screen.getByTestId('noaa-station-select-1'));

      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(WeatherRadio.CMD_SELECTSTATION, ADDR, { station: 1 }));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('shows an error when selecting fails', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      await scan();
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      fireEvent.click(screen.getByTestId('noaa-station-select-1'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to select weather radio station')));
    });
  });

  describe('device playing outside a preview', () => {
    beforeEach(() => {
      mockDevice = makeDevice(ADDR, { [WeatherRadio.ATTR_PLAYINGSTATE]: WeatherRadio.PLAYINGSTATE_PLAYING });
    });

    it('offers a Stop control', async () => {
      render(<NoaaRadioConfigurator address={ADDR} />);
      expect(screen.getByTestId('noaa-radio-playing')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('noaa-radio-stop-playing'));

      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(WeatherRadio.CMD_STOPPLAYINGSTATION, ADDR, {}));
    });

    it('shows an error when stopping fails', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<NoaaRadioConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('noaa-radio-stop-playing'));

      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(error('Failed to stop weather radio')));
    });
  });

  it('handles a device without a selected station', () => {
    mockDevice = undefined;
    render(<NoaaRadioConfigurator address={ADDR} />);
    expect(screen.getByTestId('noaa-radio-selected')).toHaveTextContent('No station selected');
    expect(screen.queryByTestId('noaa-radio-playing')).not.toBeInTheDocument();
  });
});
