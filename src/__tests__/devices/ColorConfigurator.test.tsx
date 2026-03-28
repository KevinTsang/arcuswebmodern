import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Color, ColorTemperature } from '@arcus/core';
import ColorConfigurator from '@/components/devices/ColorConfigurator';

const mockSetAttribute = jest.fn();
const mockSetAttributes = jest.fn();
let mockDevice: Record<string, unknown> = {};

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

beforeEach(() => {
  mockSetAttribute.mockClear();
  mockSetAttributes.mockClear();
});

describe('ColorConfigurator', () => {
  it('renders hue and saturation sliders', () => {
    mockDevice = { [Color.ATTR_HUE]: 180, [Color.ATTR_SATURATION]: 80 };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Hue: 180°')).toBeInTheDocument();
    expect(screen.getByText('Saturation: 80%')).toBeInTheDocument();
  });

  it('does not render color temperature slider when device lacks colortemp cap', () => {
    mockDevice = { [Color.ATTR_HUE]: 0, [Color.ATTR_SATURATION]: 100, [Base.ATTR_CAPS]: ['color'] };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    expect(screen.queryByText(/Color Temperature/)).not.toBeInTheDocument();
  });

  it('renders color temperature slider when device has colortemp cap', () => {
    mockDevice = {
      [Color.ATTR_HUE]: 0,
      [Color.ATTR_SATURATION]: 100,
      [ColorTemperature.ATTR_COLORTEMP]: 4000,
      [Base.ATTR_CAPS]: ['color', 'colortemp'],
    };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Color Temperature: 4000K')).toBeInTheDocument();
  });

  it('sends setAttributes with hue and saturation on hue change', () => {
    mockDevice = { [Color.ATTR_HUE]: 100, [Color.ATTR_SATURATION]: 80 };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '200' } });
    expect(mockSetAttributes).toHaveBeenCalledWith({ [Color.ATTR_HUE]: 200, [Color.ATTR_SATURATION]: 80 });
  });

  it('sends setAttribute on saturation change', () => {
    mockDevice = { [Color.ATTR_HUE]: 100, [Color.ATTR_SATURATION]: 80 };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[1], { target: { value: '50' } });
    expect(mockSetAttribute).toHaveBeenCalledWith(Color.ATTR_SATURATION, 50);
  });

  it('sends setAttribute on color temperature change', () => {
    mockDevice = {
      [Color.ATTR_HUE]: 0,
      [Color.ATTR_SATURATION]: 100,
      [ColorTemperature.ATTR_COLORTEMP]: 3000,
      [Base.ATTR_CAPS]: ['color', 'colortemp'],
    };
    render(<ColorConfigurator address="DRIV:dev:test" />);
    const sliders = screen.getAllByRole('slider');
    // Third slider is color temp
    fireEvent.change(sliders[2], { target: { value: '5000' } });
    expect(mockSetAttribute).toHaveBeenCalledWith(ColorTemperature.ATTR_COLORTEMP, 5000);
  });
});
