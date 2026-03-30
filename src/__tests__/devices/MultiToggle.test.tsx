import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Device, DeviceConnection, Switch } from '@arcus/core';
import MultiToggle from '@/components/devices/MultiToggle';
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

beforeEach(() => {
  mockSetAttribute.mockClear();
});

describe('MultiToggle', () => {
  beforeEach(() => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'swit', 'devconn'],
      [Base.ATTR_INSTANCES]: { relay1: ['swit'], relay2: ['swit'] },
      [Device.ATTR_DEVTYPEHINT]: 'Switch',
      [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE,
      [`${Switch.ATTR_STATE}:relay1`]: Switch.STATE_ON,
      [`${Switch.ATTR_STATE}:relay2`]: Switch.STATE_OFF,
    };
  });

  it('renders a toggle for each instance', () => {
    render(<MultiToggle address="DRIV:dev:test" />);
    expect(screen.getByText('Relay 1')).toBeInTheDocument();
    expect(screen.getByText('Relay 2')).toBeInTheDocument();
  });

  it('renders toggle switches with correct aria state', () => {
    render(<MultiToggle address="DRIV:dev:test" />);
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');  // relay1 ON
    expect(switches[1]).toHaveAttribute('aria-checked', 'false'); // relay2 OFF
  });

  it('sends correct attribute when toggling relay1 off', async () => {
    render(<MultiToggle address="DRIV:dev:test" />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(`${Switch.ATTR_STATE}:relay1`, Switch.STATE_OFF);
    });
  });

  it('sends correct attribute when toggling relay2 on', async () => {
    render(<MultiToggle address="DRIV:dev:test" />);
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]);
    await waitFor(() => {
      expect(mockSetAttribute).toHaveBeenCalledWith(`${Switch.ATTR_STATE}:relay2`, Switch.STATE_ON);
    });
  });

  it('renders nothing when device has no instances', () => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'swit'],
      [Device.ATTR_DEVTYPEHINT]: 'Switch',
      [Switch.ATTR_STATE]: Switch.STATE_ON,
    };
    const { container } = render(<MultiToggle address="DRIV:dev:test" />);
    expect(container.innerHTML).toBe('');
  });
});

describe('MultiToggle with outlet names', () => {
  beforeEach(() => {
    mockDevice = {
      id: 'DRIV:dev:test',
      [Base.ATTR_ADDRESS]: 'DRIV:dev:test',
      [Base.ATTR_CAPS]: ['base', 'swit', 'devconn'],
      [Base.ATTR_INSTANCES]: { outlet1: ['swit'], outlet2: ['swit'] },
      [Device.ATTR_DEVTYPEHINT]: 'Switch',
      [DeviceConnection.ATTR_STATE]: DeviceConnection.STATE_ONLINE,
      [`${Switch.ATTR_STATE}:outlet1`]: Switch.STATE_OFF,
      [`${Switch.ATTR_STATE}:outlet2`]: Switch.STATE_ON,
    };
  });

  it('renders outlet labels', () => {
    render(<MultiToggle address="DRIV:dev:test" />);
    expect(screen.getByText('Outlet 1')).toBeInTheDocument();
    expect(screen.getByText('Outlet 2')).toBeInTheDocument();
  });
});
