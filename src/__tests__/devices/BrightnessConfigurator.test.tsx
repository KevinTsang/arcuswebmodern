import { render, screen, fireEvent } from '@testing-library/react';
import { Dimmer } from '@arcus/core';
import BrightnessConfigurator from '@/components/device/BrightnessConfigurator';

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

describe('BrightnessConfigurator', () => {
  it('displays current brightness', () => {
    mockDevice = { [Dimmer.ATTR_BRIGHTNESS]: 75 };
    render(<BrightnessConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Brightness: 75%')).toBeInTheDocument();
  });

  it('defaults to 100% when no brightness attribute', () => {
    mockDevice = {};
    render(<BrightnessConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Brightness: 100%')).toBeInTheDocument();
  });

  it('sends setAttribute on slider change', () => {
    mockDevice = { [Dimmer.ATTR_BRIGHTNESS]: 50 };
    render(<BrightnessConfigurator address="DRIV:dev:test" />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '80' } });
    expect(mockSetAttribute).toHaveBeenCalledWith(Dimmer.ATTR_BRIGHTNESS, 80);
  });

  it('renders a range input with correct min/max', () => {
    mockDevice = { [Dimmer.ATTR_BRIGHTNESS]: 50 };
    render(<BrightnessConfigurator address="DRIV:dev:test" />);
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
  });
});
