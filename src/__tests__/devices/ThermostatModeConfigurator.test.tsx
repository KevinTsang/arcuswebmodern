import { render, screen, fireEvent } from '@testing-library/react';
import { Thermostat } from '@arcus/core';
import ThermostatModeConfigurator from '@/components/devices/ThermostatModeConfigurator';

const mockSetAttribute = jest.fn();
let mockDevice: Record<string, unknown> = {};

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    setAttributes: jest.fn(),
    sendCommand: jest.fn(),
  }),
}));

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('ThermostatModeConfigurator', () => {
  it('renders all mode buttons', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF };
    render(<ThermostatModeConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Heat')).toBeInTheDocument();
    expect(screen.getByText('Cool')).toBeInTheDocument();
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('sends setAttribute when switching to Heat', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF };
    render(<ThermostatModeConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Heat'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_HEAT);
  });

  it('sends setAttribute when switching to Cool', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT };
    render(<ThermostatModeConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Cool'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_COOL);
  });

  it('sends setAttribute when switching to Auto', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_OFF };
    render(<ThermostatModeConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Auto'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_AUTO);
  });

  it('sends setAttribute when switching to Off', () => {
    mockDevice = { [Thermostat.ATTR_HVACMODE]: Thermostat.HVACMODE_HEAT };
    render(<ThermostatModeConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Off'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Thermostat.ATTR_HVACMODE, Thermostat.HVACMODE_OFF);
  });
});
