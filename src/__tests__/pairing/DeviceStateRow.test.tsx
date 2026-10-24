import { render, screen } from '@testing-library/react';
import { Base, PairingDevice } from '@arcus/core';
import DeviceStateRow from '@/components/pairing/DeviceStateRow';

const makeDevice = (state: string, phase: string) => ({
  [Base.ATTR_ADDRESS]: 'DRIV:dev:dev-1',
  [PairingDevice.ATTR_PAIRINGSTATE]: state,
  [PairingDevice.ATTR_PAIRINGPHASE]: phase,
});

describe('DeviceStateRow', () => {
  it('matches snapshot', () => {
    const { container } = render(<DeviceStateRow device={makeDevice('PAIRING', 'JOIN')} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('labels a device left from an earlier pairing', () => {
    render(<DeviceStateRow device={makeDevice('MISPAIRED', 'FAILED')} earlier />);
    expect(screen.getByTestId('pairing-device-row-DRIV:dev:dev-1')).toHaveAttribute('data-earlier', 'true');
    expect(screen.getByText('From an earlier pairing')).toBeInTheDocument();
    expect(screen.queryByText('Device Found')).not.toBeInTheDocument();
    expect(screen.getByText('Improperly Paired')).toBeInTheDocument();
  });

  it('shows "Device Found" label', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'JOIN')} />);
    expect(screen.getByText('Device Found')).toBeInTheDocument();
  });

  it('shows "Connecting…" for JOIN phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'JOIN')} />);
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('shows "Connecting…" for CONNECT phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'CONNECT')} />);
    expect(screen.getByText('Connecting…')).toBeInTheDocument();
  });

  it('shows "Identifying…" for IDENTIFY phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'IDENTIFY')} />);
    expect(screen.getByText('Identifying…')).toBeInTheDocument();
  });

  it('shows "Configuring…" for PREPARE phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'PREPARE')} />);
    expect(screen.getByText('Configuring…')).toBeInTheDocument();
  });

  it('shows "Configuring…" for CONFIGURE phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'CONFIGURE')} />);
    expect(screen.getByText('Configuring…')).toBeInTheDocument();
  });

  it('shows "Ready" for PAIRED phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'PAIRED')} />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('shows "Pairing…" for unknown phase', () => {
    render(<DeviceStateRow device={makeDevice('PAIRING', 'UNKNOWN')} />);
    expect(screen.getByText('Pairing…')).toBeInTheDocument();
  });

  it('shows "Paired" for PAIRED state', () => {
    render(<DeviceStateRow device={makeDevice('PAIRED', 'PAIRED')} />);
    expect(screen.getByText('Paired')).toBeInTheDocument();
  });

  it('shows "Improperly Paired" for MISPAIRED state', () => {
    render(<DeviceStateRow device={makeDevice('MISPAIRED', 'FAILED')} />);
    expect(screen.getByText('Improperly Paired')).toBeInTheDocument();
  });

  it('shows "Improperly Paired" for MISCONFIGURED state', () => {
    render(<DeviceStateRow device={makeDevice('MISCONFIGURED', 'FAILED')} />);
    expect(screen.getByText('Improperly Paired')).toBeInTheDocument();
  });

  it('shows "Discovering…" for unknown state', () => {
    render(<DeviceStateRow device={makeDevice('UNKNOWN', 'UNKNOWN')} />);
    expect(screen.getByText('Discovering…')).toBeInTheDocument();
  });
});
