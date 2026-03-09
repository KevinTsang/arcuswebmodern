import { render, screen, fireEvent } from '@testing-library/react';
import { TemperatureSelector } from '@/components/scene/TemperatureSelector';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('TemperatureSelector', () => {
  it('renders name and temperature in Fahrenheit', () => {
    // cToF(20) = Math.round(20 * 9/5 + 32) = 68
    render(<TemperatureSelector name="setpoint" current={20} onChange={mockOnChange} />);
    expect(screen.getByText('setpoint')).toBeInTheDocument();
    expect(screen.getByText(/68.*F/)).toBeInTheDocument();
  });

  it('defaults to 20°C when current is not a number', () => {
    render(<TemperatureSelector name="setpoint" current={undefined} onChange={mockOnChange} />);
    expect(screen.getByText(/68.*F/)).toBeInTheDocument();
  });

  it('decrements by ~1°F on minus click', () => {
    render(<TemperatureSelector name="setpoint" current={20} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('-'));
    expect(mockOnChange).toHaveBeenCalledWith('setpoint', Number((20 - 0.5556).toFixed(2)));
  });

  it('increments by ~1°F on plus click', () => {
    render(<TemperatureSelector name="setpoint" current={20} onChange={mockOnChange} />);
    fireEvent.click(screen.getByText('+'));
    expect(mockOnChange).toHaveBeenCalledWith('setpoint', Number((20 + 0.5556).toFixed(2)));
  });
});
