import { render, screen, fireEvent } from '@testing-library/react';
import { ThermostatSelector } from '@/components/scenes/ThermostatSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('ThermostatSelector', () => {
  it('renders name and mode buttons', () => {
    render(<ThermostatSelector name="thermostat" values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('thermostat')).toBeInTheDocument();
    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.getByText('HEAT')).toBeInTheDocument();
    expect(screen.getByText('COOL')).toBeInTheDocument();
    expect(screen.getByText('AUTO')).toBeInTheDocument();
  });

  it('calls onChange with mode on mode button click', () => {
    render(<ThermostatSelector name="thermostat" values={{}} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('HEAT'));
    expect(mockOnChange).toHaveBeenCalledWith('mode', 'HEAT');
  });

  it('shows heat controls when mode is HEAT', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'HEAT' }} onChange={mockOnChange} />);
    expect(screen.getByText('Heat')).toBeInTheDocument();
    expect(screen.queryByText('Cool')).not.toBeInTheDocument();
  });

  it('shows cool controls when mode is COOL', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'COOL' }} onChange={mockOnChange} />);
    expect(screen.getByText('Cool')).toBeInTheDocument();
    expect(screen.queryByText('Heat')).not.toBeInTheDocument();
  });

  it('shows both heat and cool controls when mode is AUTO', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'AUTO' }} onChange={mockOnChange} />);
    expect(screen.getByText('Heat')).toBeInTheDocument();
    expect(screen.getByText('Cool')).toBeInTheDocument();
  });

  it('shows no setpoint controls when mode is OFF', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'OFF' }} onChange={mockOnChange} />);
    expect(screen.queryByText('Heat')).not.toBeInTheDocument();
    expect(screen.queryByText('Cool')).not.toBeInTheDocument();
  });

  it('increments heatsetpoint on heat plus click', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'HEAT', heatsetpoint: 20 }} onChange={mockOnChange} />);
    const buttons = screen.getAllByText('+');
    fireEvent.click(buttons[0]);
    expect(mockOnChange).toHaveBeenCalledWith('heatsetpoint', Number((20 + 0.5556).toFixed(2)));
  });

  it('decrements coolsetpoint on cool minus click', () => {
    render(<ThermostatSelector name="thermostat" values={{ mode: 'COOL', coolsetpoint: 24 }} onChange={mockOnChange} />);
    const buttons = screen.getAllByText('-');
    fireEvent.click(buttons[0]);
    expect(mockOnChange).toHaveBeenCalledWith('coolsetpoint', Number((24 - 0.5556).toFixed(2)));
  });
});
