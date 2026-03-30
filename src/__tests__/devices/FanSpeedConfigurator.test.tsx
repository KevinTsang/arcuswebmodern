import { render, screen, fireEvent } from '@testing-library/react';
import { Base, Fan } from '@arcus/core';
import FanSpeedConfigurator from '@/components/devices/FanSpeedConfigurator';
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

describe('FanSpeedConfigurator', () => {
  it('renders all speed buttons', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Fan.ATTR_SPEED]: 0 };
    render(<FanSpeedConfigurator address="DRIV:dev:test" />);
    expect(screen.getByText('Off')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('sends setAttribute with correct speed value', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Fan.ATTR_SPEED]: 0 };
    render(<FanSpeedConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Medium'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Fan.ATTR_SPEED, 66);
  });

  it('sends setAttribute for High speed', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Fan.ATTR_SPEED]: 33 };
    render(<FanSpeedConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('High'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Fan.ATTR_SPEED, 100);
  });

  it('sends setAttribute for Off', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Fan.ATTR_SPEED]: 100 };
    render(<FanSpeedConfigurator address="DRIV:dev:test" />);
    fireEvent.click(screen.getByText('Off'));
    expect(mockSetAttribute).toHaveBeenCalledWith(Fan.ATTR_SPEED, 0);
  });
});
