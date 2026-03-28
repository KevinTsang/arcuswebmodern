import { render, screen, fireEvent } from '@testing-library/react';
import { Contact } from '@arcus/core';
import ContactSettingConfigurator from '@/components/devices/ContactSettingConfigurator';

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

describe('ContactSettingConfigurator', () => {
  it('renders all contact type options', () => {
    mockDevice = { [Contact.ATTR_USEHINT]: Contact.USEHINT_UNKNOWN };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Door')).toBeInTheDocument();
    expect(screen.getByText('Window')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('sends setAttribute when selecting Door', () => {
    mockDevice = { [Contact.ATTR_USEHINT]: Contact.USEHINT_UNKNOWN };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Door'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_DOOR);
  });

  it('sends setAttribute when selecting Window', () => {
    mockDevice = { [Contact.ATTR_USEHINT]: Contact.USEHINT_DOOR };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Window'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_WINDOW);
  });

  it('sends setAttribute when selecting Other', () => {
    mockDevice = { [Contact.ATTR_USEHINT]: Contact.USEHINT_DOOR };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Other'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_OTHER);
  });
});
