import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DeviceAdvanced, HoneywellTCC, Thermostat } from '@arcus/core';
import ThermostatModeConfigurator from '@/components/devices/ThermostatModeConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:test';
const mockSetAttribute = jest.fn();
const mockSetAttributes = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined = makeDevice(ADDR);

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    setAttributes: mockSetAttributes,
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: { type: string; message: string }) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const c = (f: number) => (f - 32) * 5 / 9;

function thermostat(overrides: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [Device.ATTR_DEVTYPEHINT]: 'Thermostat',
    [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF,
    [Thermostat.ATTR_FANMODE]: Thermostat.FANMODE_AUTO,
    [Thermostat.ATTR_HEATSETPOINT]: c(68),
    [Thermostat.ATTR_COOLSETPOINT]: c(76),
    ...overrides,
  });
}

function notification(message: string) {
  return { type: 'ui/addNotification', payload: { type: 'error', message } };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttribute.mockResolvedValue(undefined);
  mockSetAttributes.mockResolvedValue(undefined);
  mockDevice = thermostat();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatModeConfigurator', () => {
  describe('rendering', () => {
    it('matches snapshot', () => {
      const { asFragment } = render(<ThermostatModeConfigurator address={ADDR} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('renders all mode buttons', () => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-off')).toHaveTextContent('Off');
      expect(screen.getByTestId('hvac-mode-heat')).toHaveTextContent('Heat');
      expect(screen.getByTestId('hvac-mode-cool')).toHaveTextContent('Cool');
      expect(screen.getByTestId('hvac-mode-auto')).toHaveTextContent('Auto');
      expect(screen.queryByTestId('hvac-mode-eco')).not.toBeInTheDocument();
    });

    it('marks the current HVAC and fan modes', () => {
      mockDevice = thermostat({ [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT, [Thermostat.ATTR_FANMODE]: Thermostat.FANMODE_ON });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-heat')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('hvac-mode-off')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('fan-mode-on')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('fan-mode-auto')).toHaveAttribute('aria-pressed', 'false');
    });

    it('shows Eco when the thermostat supports it', () => {
      mockDevice = thermostat({
        [Thermostat.ATTR_SUPPORTEDMODES]: [Thermostat.HVACMODE_HEAT, Thermostat.HVACMODE_COOL, Thermostat.HVACMODE_AUTO, Thermostat.HVACMODE_ECO],
      });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-eco')).toHaveTextContent('Eco');
    });

    it('hides Auto when the thermostat does not support it', () => {
      mockDevice = thermostat({ [Thermostat.ATTR_SUPPORTSAUTO]: false });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.queryByTestId('hvac-mode-auto')).not.toBeInTheDocument();
      expect(screen.queryByTestId('thermostat-tcc-auto-note')).not.toBeInTheDocument();
    });

    it('labels Auto as "Heat • Cool" for Nest', () => {
      mockDevice = thermostat({ [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat' });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-auto')).toHaveTextContent('Heat • Cool');
    });

    it('explains how to enable Auto on a Honeywell TCC thermostat', () => {
      mockDevice = thermostat({
        [Device.ATTR_DEVTYPEHINT]: 'TCCThermostat',
        [Base.ATTR_CAPS]: ['therm', HoneywellTCC.NAMESPACE],
        [Thermostat.ATTR_SUPPORTSAUTO]: false,
      });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('thermostat-tcc-auto-note')).toHaveTextContent('Honeywell requires you to first enable');
    });

    it('disables the controls while Nest is rate limiting', () => {
      mockDevice = thermostat({
        [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat',
        [DeviceAdvanced.ATTR_ERRORS]: { ERR_RATELIMIT: 'Rate limited' },
      });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-heat')).toBeDisabled();
      expect(screen.getByTestId('fan-mode-on')).toBeDisabled();
      expect(screen.getByTestId('thermostat-mode-blocked')).toBeInTheDocument();
    });
  });

  describe('HVAC mode', () => {
    it.each([
      ['heat', Thermostat.HVACMODE_HEAT],
      ['cool', Thermostat.HVACMODE_COOL],
    ])('sets the mode to %s', async (id, mode) => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId(`hvac-mode-${id}`));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, mode));
    });

    it('sets the mode to Off', async () => {
      mockDevice = thermostat({ [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT });
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('hvac-mode-off'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_OFF));
    });

    it('switches to Auto without touching well-separated setpoints', async () => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('hvac-mode-auto'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_AUTO));
      expect(mockSetAttributes).not.toHaveBeenCalled();
    });

    it('resets setpoints to 68/78 °F when entering Auto with too little separation', async () => {
      mockDevice = thermostat({ [Thermostat.ATTR_HEATSETPOINT]: c(72), [Thermostat.ATTR_COOLSETPOINT]: c(73) });
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('hvac-mode-auto'));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledWith({
        [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_AUTO,
        [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(68), 5),
        [Thermostat.ATTR_COOLSETPOINT]: expect.closeTo(c(78), 5),
      }));
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('does nothing when the current mode is clicked', () => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('hvac-mode-off'));
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('notifies when changing the mode fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('hvac-mode-heat'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('Failed to change thermostat mode')));
    });
  });

  describe('fan mode', () => {
    it('turns the fan on', async () => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('fan-mode-on'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_FANMODE, Thermostat.FANMODE_ON));
    });

    it('sets the fan back to auto', async () => {
      mockDevice = thermostat({ [Thermostat.ATTR_FANMODE]: Thermostat.FANMODE_ON });
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('fan-mode-auto'));
      await waitFor(() => expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_FANMODE, Thermostat.FANMODE_AUTO));
    });

    it('does nothing when the current fan mode is clicked', () => {
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('fan-mode-auto'));
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('notifies when changing the fan mode fails', async () => {
      mockSetAttribute.mockRejectedValueOnce(new Error('fail'));
      render(<ThermostatModeConfigurator address={ADDR} />);
      fireEvent.click(screen.getByTestId('fan-mode-on'));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(notification('Failed to change fan mode')));
    });
  });

  describe('edge cases', () => {
    it('renders with no device and ignores clicks', () => {
      mockDevice = undefined;
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('hvac-mode-auto')).toHaveTextContent('Auto');
      fireEvent.click(screen.getByTestId('hvac-mode-heat'));
      expect(mockSetAttribute).not.toHaveBeenCalled();
    });

    it('marks no fan mode when the device does not report one', () => {
      mockDevice = thermostat({ [Thermostat.ATTR_FANMODE]: undefined });
      render(<ThermostatModeConfigurator address={ADDR} />);
      expect(screen.getByTestId('fan-mode-auto')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('fan-mode-on')).toHaveAttribute('aria-pressed', 'false');
    });
  });
});
