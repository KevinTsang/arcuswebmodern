import { render, screen } from '@testing-library/react';
import FavoriteDeviceChip from '@/components/home/FavoriteDeviceChip';
import { Base, Device } from '@arcus/core';
import type { DeviceEntity } from '@/store/entityTypes';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

function device(name?: string, address = 'DRIV:dev:d1'): DeviceEntity {
  return {
    id: address,
    [Base.ATTR_ADDRESS]: address,
    ...(name ? { [Device.ATTR_NAME]: name } : {}),
  } as DeviceEntity;
}

describe('FavoriteDeviceChip', () => {
  it('renders the device name', () => {
    render(<FavoriteDeviceChip device={device('Lamp')} />);
    expect(screen.getByText('Lamp')).toBeInTheDocument();
  });

  it('deep-links to the device on the devices page', () => {
    render(<FavoriteDeviceChip device={device('Lamp', 'DRIV:dev:d1')} />);
    expect(screen.getByRole('link', { name: 'Lamp' })).toHaveAttribute(
      'href',
      '/devices?device=DRIV%3Adev%3Ad1',
    );
  });

  it('falls back to "Device" when unnamed', () => {
    render(<FavoriteDeviceChip device={device()} />);
    expect(screen.getByText('Device')).toBeInTheDocument();
  });
});
