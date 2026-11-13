import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Device, DeviceAdvanced, NestThermostat, Thermostat } from '@arcus/core';
import ThermostatControl from '@/components/devices/ThermostatControl';
import type { DeviceEntity } from '@/store/entityTypes';
import { makeDevice } from '../helpers/factories';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:test';
const mockSetAttributes = jest.fn();
const mockDispatch = jest.fn();
let mockDevice: DeviceEntity | undefined = makeDevice(ADDR);

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: jest.fn(),
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

function thermostat(mode: string, heatF?: number, coolF?: number, extra: Partial<DeviceEntity> = {}): DeviceEntity {
  return makeDevice(ADDR, {
    [Thermostat.ATTR_HVACMODE]: mode,
    ...(heatF != null ? { [Thermostat.ATTR_HEATSETPOINT]: c(heatF) } : {}),
    ...(coolF != null ? { [Thermostat.ATTR_COOLSETPOINT]: c(coolF) } : {}),
    ...extra,
  });
}

function sentAttrs(): Record<string, number> {
  return mockSetAttributes.mock.calls[0][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSetAttributes.mockResolvedValue(undefined);
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ThermostatControl', () => {
  describe('rendering', () => {
    it('matches snapshot in AUTO mode', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70, 75);
      const { asFragment } = render(<ThermostatControl address={ADDR} />);
      expect(asFragment()).toMatchSnapshot();
    });

    it('renders "Off" when HVAC mode is OFF', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_OFF);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('renders Eco with no setpoint controls in ECO mode', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_ECO, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-eco-${ADDR}`)).toHaveTextContent('Eco');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the heat setpoint in HEAT mode', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-value-${ADDR}`)).toHaveTextContent('70°');
      expect(screen.queryByTestId(`thermostat-cool-value-${ADDR}`)).not.toBeInTheDocument();
    });

    it('renders the cool setpoint in COOL mode', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_COOL, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-cool-value-${ADDR}`)).toHaveTextContent('75°');
      expect(screen.queryByTestId(`thermostat-heat-value-${ADDR}`)).not.toBeInTheDocument();
    });

    it('renders both setpoints in AUTO mode', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByText('70°')).toBeInTheDocument();
      expect(screen.getByText('75°')).toBeInTheDocument();
      expect(screen.getByText('to')).toBeInTheDocument();
    });

    it('shows Temp Timeout when Nest is rate limiting', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75, {
        [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat',
        [DeviceAdvanced.ATTR_ERRORS]: { ERR_RATELIMIT: 'Rate limited' },
      });
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-blocked-${ADDR}`)).toHaveTextContent('Temp Timeout');
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('increments the heat setpoint', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({ [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(71), 5) });
    });

    it('decrements the heat setpoint', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-down-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({ [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(69), 5) });
    });

    it('increments the cool setpoint', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_COOL, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-cool-up-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({ [Thermostat.ATTR_COOLSETPOINT]: expect.closeTo(c(76), 5) });
    });

    it('decrements the cool setpoint', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_COOL, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-cool-down-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({ [Thermostat.ATTR_COOLSETPOINT]: expect.closeTo(c(74), 5) });
    });

    it('pushes the cool setpoint to keep 3 °F separation in AUTO', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70, 73);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({
        [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(71), 5),
        [Thermostat.ATTR_COOLSETPOINT]: expect.closeTo(c(74), 5),
      });
    });

    it('pushes the heat setpoint to keep 3 °F separation in AUTO', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70, 73);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-cool-down-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({
        [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(69), 5),
        [Thermostat.ATTR_COOLSETPOINT]: expect.closeTo(c(72), 5),
      });
    });

    it('disables the buttons while a change is saving', async () => {
      let resolve: () => void = () => {};
      mockSetAttributes.mockReturnValueOnce(new Promise<void>((r) => { resolve = r; }));
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      await waitFor(() => expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeDisabled());
      resolve();
      await waitFor(() => expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeEnabled());
    });

    it('notifies on failure and re-enables the buttons', async () => {
      mockSetAttributes.mockRejectedValueOnce(new Error('fail'));
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 70, 75);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to change thermostat temperature' },
      }));
      expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeEnabled();
    });
  });

  describe('limits', () => {
    it('disables raising the heat setpoint at 95 °F', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 95, 75);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeDisabled();
      expect(screen.getByTestId(`thermostat-heat-down-${ADDR}`)).toBeEnabled();
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      expect(mockSetAttributes).not.toHaveBeenCalled();
    });

    it('disables lowering the cool setpoint at 45 °F', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_COOL, 70, 45);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-cool-down-${ADDR}`)).toBeDisabled();
    });

    it('disables raising heat in AUTO when cool is at the maximum', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 92, 95);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeDisabled();
      expect(screen.getByTestId(`thermostat-cool-up-${ADDR}`)).toBeDisabled();
      expect(screen.getByTestId(`thermostat-heat-down-${ADDR}`)).toBeEnabled();
    });

    it('respects the limits the device reports', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 80, 85, { [Thermostat.ATTR_MAXSETPOINT]: c(80) });
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-up-${ADDR}`)).toBeDisabled();
    });

    it('respects a Nest temperature lock', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_HEAT, 62, 75, {
        [Device.ATTR_DEVTYPEHINT]: 'Nest Thermostat',
        [NestThermostat.ATTR_LOCKED]: true,
        [NestThermostat.ATTR_LOCKEDTEMPMIN]: c(62),
        [NestThermostat.ATTR_LOCKEDTEMPMAX]: c(78),
      });
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-down-${ADDR}`)).toBeDisabled();
    });
  });

  describe('edge cases', () => {
    it('renders nothing actionable when the device is missing', () => {
      mockDevice = undefined;
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByText('Off')).toBeInTheDocument();
    });

    it('hides a setpoint the device does not report', () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70);
      render(<ThermostatControl address={ADDR} />);
      expect(screen.getByTestId(`thermostat-heat-value-${ADDR}`)).toBeInTheDocument();
      expect(screen.queryByTestId(`thermostat-cool-value-${ADDR}`)).not.toBeInTheDocument();
    });

    it('changes only heat in AUTO when cool is missing', async () => {
      mockDevice = thermostat(Thermostat.HVACMODE_AUTO, 70);
      render(<ThermostatControl address={ADDR} />);
      fireEvent.click(screen.getByTestId(`thermostat-heat-up-${ADDR}`));
      await waitFor(() => expect(mockSetAttributes).toHaveBeenCalledTimes(1));
      expect(sentAttrs()).toEqual({ [Thermostat.ATTR_HEATSETPOINT]: expect.closeTo(c(71), 5) });
    });
  });
});
