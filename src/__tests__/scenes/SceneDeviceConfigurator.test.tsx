import { render, screen } from '@testing-library/react';
import { SelectorType } from '@/components/scenes/types';
import type { SelectorDef } from '@/components/scenes/types';
import { SceneDeviceConfigurator } from '@/components/scenes/SceneDeviceConfigurator';

let mockOnChange: jest.Mock;

beforeEach(() => {
  mockOnChange = jest.fn();
});

describe('SceneDeviceConfigurator', () => {
  it('renders multiple selectors', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.BOOLEAN, name: 'enabled' },
      { type: SelectorType.PERCENT, name: 'brightness', min: 0, max: 100 },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ enabled: true, brightness: 60 }} onChange={mockOnChange} />);
    expect(screen.getByText('enabled')).toBeInTheDocument();
    expect(screen.getByText('brightness')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('renders fallback for unknown selector type', () => {
    const selectors: SelectorDef[] = [
      { type: 'CUSTOM', name: 'custom', value: 'hello' },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ custom: 'hello' }} onChange={mockOnChange} />);
    expect(screen.getByText('custom:')).toBeInTheDocument();
    expect(screen.getByText('hello')).toBeInTheDocument();
  });

  it('uses sel.value as fallback when key is not in values', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.BOOLEAN, name: 'notify', value: true },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{}} onChange={mockOnChange} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('renders nothing inside when selectors is empty', () => {
    const { container } = render(<SceneDeviceConfigurator selectors={[]} values={{}} onChange={mockOnChange} />);
    expect(container.firstChild?.childNodes.length).toBe(0);
  });

  it('delegates GROUP to GroupSelector', () => {
    const selectors: SelectorDef[] = [
      {
        type: SelectorType.GROUP,
        name: 'switch',
        options: [{ label: 'On', value: 'ON' }, { label: 'Off', value: 'OFF' }],
      },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ switch: 'ON' }} onChange={mockOnChange} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByText('On')).toBeInTheDocument();
  });

  it('delegates LIST to ListSelector', () => {
    const selectors: SelectorDef[] = [
      {
        type: SelectorType.LIST,
        name: 'speed',
        options: [{ label: 'Low', value: 'LOW' }, { label: 'High', value: 'HIGH' }],
      },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ speed: 'LOW' }} onChange={mockOnChange} />);
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('delegates RANGE to RangeSelector', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.RANGE, name: 'level', min: 0, max: 10 },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ level: 5 }} onChange={mockOnChange} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('delegates DURATION to RangeSelector with "s" suffix', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.DURATION, name: 'delay', min: 0, max: 60 },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ delay: 30 }} onChange={mockOnChange} />);
    expect(screen.getByText('30s')).toBeInTheDocument();
  });

  it('delegates TEMPERATURE to TemperatureSelector', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.TEMPERATURE, name: 'setpoint' },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ setpoint: 20 }} onChange={mockOnChange} />);
    expect(screen.getByText(/68.*F/)).toBeInTheDocument();
  });

  it('delegates THERMOSTAT to ThermostatSelector', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.THERMOSTAT, name: 'hvac' },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{ mode: 'HEAT' }} onChange={mockOnChange} />);
    expect(screen.getByText('HEAT')).toBeInTheDocument();
    expect(screen.getByText('Heat')).toBeInTheDocument();
  });

  it('falls back for GROUP without options', () => {
    const selectors: SelectorDef[] = [
      { type: SelectorType.GROUP, name: 'broken' },
    ];
    render(<SceneDeviceConfigurator selectors={selectors} values={{}} onChange={mockOnChange} />);
    expect(screen.getByText('broken:')).toBeInTheDocument();
  });
});
