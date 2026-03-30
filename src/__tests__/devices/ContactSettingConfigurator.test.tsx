import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Contact } from '@arcus/core';
import ContactSettingConfigurator from '@/components/devices/ContactSettingConfigurator';
import type { DeviceEntity } from '@/store/entityTypes';

const mockSetAttribute = jest.fn();
let mockDevice: DeviceEntity = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };

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
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Contact.ATTR_USEHINT]: Contact.USEHINT_UNKNOWN };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Door')).toBeInTheDocument();
    expect(screen.getByText('Window')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('sends setAttribute when selecting Door', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Contact.ATTR_USEHINT]: Contact.USEHINT_UNKNOWN };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Door'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_DOOR);
  });

  it('sends setAttribute when selecting Window', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Contact.ATTR_USEHINT]: Contact.USEHINT_DOOR };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Window'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_WINDOW);
  });

  it('sends setAttribute when selecting Other', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Contact.ATTR_USEHINT]: Contact.USEHINT_DOOR };
    render(<ContactSettingConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Other'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Contact.ATTR_USEHINT, Contact.USEHINT_OTHER);
  });
});
