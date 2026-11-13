import { render, screen, fireEvent } from '@testing-library/react';
import { CareBehaviorTemperatureField } from '@/components/subsystems/CareBehaviorTemperatureField';
import { fToC, templateField } from '@/lib/careBehaviors';
import type { CareBehavior } from '@/store/entityTypes';
import { TEMPERATURE_TEMPLATE } from '../helpers/careBehaviorFixtures';

// ── Helpers ───────────────────────────────────────────────────────────

const onChange = jest.fn();
const field = templateField(TEMPERATURE_TEMPLATE, 'temperatureRange')!;

function renderField(behavior: CareBehavior = { lowTemp: 18.3, highTemp: 20 }, f = field) {
  return render(<CareBehaviorTemperatureField behavior={behavior} field={f} template={TEMPERATURE_TEMPLATE} onChange={onChange} />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('CareBehaviorTemperatureField', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderField();
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the range in Fahrenheit', () => {
    renderField();
    expect(screen.getByTestId('care-field-temp-low')).toHaveValue('65');
    expect(screen.getByTestId('care-field-temp-high')).toHaveValue('68');
  });

  it('limits the options to the template range with a 3° gap', () => {
    renderField();
    const low = screen.getByTestId('care-field-temp-low') as HTMLSelectElement;
    const high = screen.getByTestId('care-field-temp-high') as HTMLSelectElement;
    expect(low.options[0].value).toBe('20');
    expect(low.options[low.options.length - 1].value).toBe('102');
    expect(high.options[0].value).toBe('23');
    expect(high.options[high.options.length - 1].value).toBe('105');
  });

  it('stores a new low temperature in Celsius', () => {
    renderField();
    fireEvent.change(screen.getByTestId('care-field-temp-low'), { target: { value: '60' } });
    expect(onChange).toHaveBeenCalledWith({ lowTemp: fToC(60) });
  });

  it('pushes the high temperature up when the low gets too close', () => {
    renderField();
    fireEvent.change(screen.getByTestId('care-field-temp-low'), { target: { value: '67' } });
    expect(onChange).toHaveBeenCalledWith({ lowTemp: fToC(67), highTemp: fToC(70) });
  });

  it('stores a new high temperature in Celsius', () => {
    renderField();
    fireEvent.change(screen.getByTestId('care-field-temp-high'), { target: { value: '80' } });
    expect(onChange).toHaveBeenCalledWith({ highTemp: fToC(80) });
  });

  it('pushes the low temperature down when the high gets too close', () => {
    renderField();
    fireEvent.change(screen.getByTestId('care-field-temp-high'), { target: { value: '66' } });
    expect(onChange).toHaveBeenCalledWith({ highTemp: fToC(66), lowTemp: fToC(63) });
  });

  it('defaults to the full range when unset or the template has no values', () => {
    renderField({}, { ...field, values: [] });
    expect(screen.getByTestId('care-field-temp-low')).toHaveValue('20');
    expect(screen.getByTestId('care-field-temp-high')).toHaveValue('105');
  });
});
