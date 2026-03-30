import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Switch } from '@arcus/core';
import ToggleOnOff from '@/components/devices/ToggleOnOff';
import type { DeviceEntity } from '@/store/entityTypes';

const mockSetAttribute = jest.fn().mockResolvedValue(undefined);
let mockDevice: DeviceEntity = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test' };

jest.mock('@/hooks/useDeviceCapability', () => ({
  useDevice: () => mockDevice,
}));

jest.mock('@/hooks/useDeviceActions', () => ({
  useDeviceActions: () => ({
    setAttribute: mockSetAttribute,
    sendCommand: jest.fn(),
  }),
}));

jest.mock('@/lib/deviceConfig', () => ({
  resolveDeviceConfig: () => ({
    'web:panel:action': 'toggle-on-off',
    'web:isOnUnlessOffline': false,
    'web:switch:state': Switch.ATTR_STATE,
  }),
}));

jest.mock('@/hooks/useDeviceConfig', () => ({
  isDeviceOn: (device: DeviceEntity) => device[Switch.ATTR_STATE] === Switch.STATE_ON,
}));

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('ToggleOnOff', () => {
  it('renders as off when device is off', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Switch.ATTR_STATE]: Switch.STATE_OFF };
    render(<ToggleOnOff address="DRIV:dev:test" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('title', 'Turn on');
  });

  it('renders as on when device is on', () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Switch.ATTR_STATE]: Switch.STATE_ON };
    render(<ToggleOnOff address="DRIV:dev:test" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(toggle).toHaveAttribute('title', 'Turn off');
  });

  it('sends OFF when toggling an on device', async () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Switch.ATTR_STATE]: Switch.STATE_ON };
    render(<ToggleOnOff address="DRIV:dev:test" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(Switch.ATTR_STATE, Switch.STATE_OFF);
    });
  });

  it('sends ON when toggling an off device', async () => {
    mockDevice = { id: 'DRIV:dev:test', [Base.ATTR_ADDRESS]: 'DRIV:dev:test', [Switch.ATTR_STATE]: Switch.STATE_OFF };
    render(<ToggleOnOff address="DRIV:dev:test" />);
    fireEvent.click(screen.getByRole('switch'));
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(Switch.ATTR_STATE, Switch.STATE_ON);
    });
  });
});
