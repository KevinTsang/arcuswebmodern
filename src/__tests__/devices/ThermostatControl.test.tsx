import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Thermostat } from '@arcus/core';
import ThermostatControl from '@/components/devices/ThermostatControl';

const mockSetAttribute = jest.fn().mockResolvedValue(undefined);
let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

beforeEach(() => {
  mockSetAttribute.mockClear();
});

// Helper: 70°F ≈ 21.111°C
const f70 = (70 - 32) * 5 / 9;
// Helper: 75°F ≈ 23.889°C
const f75 = (75 - 32) * 5 / 9;

describe('ThermostatControl', () => {
  it('renders "Off" when HVAC mode is OFF', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF };
    render(<ThermostatControl address="DRIV:dev:test" />);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('renders heat setpoint in HEAT mode', () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT,
      [Thermostat.ATTR_HEATSETPOINT]: f70,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    expect(screen.getByText('70°')).toBeInTheDocument();
  });

  it('renders cool setpoint in COOL mode', () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_COOL,
      [Thermostat.ATTR_COOLSETPOINT]: f75,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    expect(screen.getByText('75°')).toBeInTheDocument();
  });

  it('renders both setpoints in AUTO mode', () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_AUTO,
      [Thermostat.ATTR_HEATSETPOINT]: f70,
      [Thermostat.ATTR_COOLSETPOINT]: f75,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    expect(screen.getByText('70°')).toBeInTheDocument();
    expect(screen.getByText('75°')).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('increments heat setpoint', async () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT,
      [Thermostat.ATTR_HEATSETPOINT]: f70,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    const buttons = screen.getAllByRole('button');
    // Second button is the "+" for heat
    fireEvent.click(buttons[1]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(
        Thermostat.ATTR_HEATSETPOINT,
        expect.closeTo((71 - 32) * 5 / 9, 1),
      );
    });
  });

  it('decrements heat setpoint', async () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT,
      [Thermostat.ATTR_HEATSETPOINT]: f70,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    const buttons = screen.getAllByRole('button');
    // First button is the "-" for heat
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(
        Thermostat.ATTR_HEATSETPOINT,
        expect.closeTo((69 - 32) * 5 / 9, 1),
      );
    });
  });

  it('increments cool setpoint', async () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_COOL,
      [Thermostat.ATTR_COOLSETPOINT]: f75,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    const buttons = screen.getAllByRole('button');
    // Second button is the "+" for cool
    fireEvent.click(buttons[1]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(
        Thermostat.ATTR_COOLSETPOINT,
        expect.closeTo((76 - 32) * 5 / 9, 1),
      );
    });
  });

  it('decrements cool setpoint', async () => {
    mockDevice = {
      [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_COOL,
      [Thermostat.ATTR_COOLSETPOINT]: f75,
    };
    render(<ThermostatControl address="DRIV:dev:test" />);
    const buttons = screen.getAllByRole('button');
    // First button is the "-" for cool
    fireEvent.click(buttons[0]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(
        Thermostat.ATTR_COOLSETPOINT,
        expect.closeTo((74 - 32) * 5 / 9, 1),
      );
    });
  });
});
