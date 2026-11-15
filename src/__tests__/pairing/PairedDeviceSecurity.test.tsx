import { render, screen } from '@testing-library/react';
import { Base, DeviceAdvanced, ZWaveProtocol } from '@arcus/core';
import { PairedDeviceSecurity } from '@/components/pairing/PairedDeviceSecurity';

// ── Mocks ─────────────────────────────────────────────────────────────

const ADDR = 'DRIV:dev:lock-1';
let mockDevices: Record<string, { [key: string]: unknown }>;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: object) => unknown) =>
    sel({ devices: { ids: Object.keys(mockDevices), entities: mockDevices } }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

function setDevice(protocol: string, protocolAttrs?: Record<string, string>) {
  mockDevices = {
    [ADDR]: {
      [Base.ATTR_ADDRESS]: ADDR,
      [DeviceAdvanced.ATTR_PROTOCOL]: protocol,
      ...(protocolAttrs ? { [DeviceAdvanced.ATTR_PROTOCOLATTRS]: protocolAttrs } : {}),
    },
  };
}

beforeEach(() => {
  mockDevices = {};
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PairedDeviceSecurity', () => {
  it('matches snapshot for a fully secured device', () => {
    setDevice('ZWAV', {
      [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
    });
    const { asFragment } = render(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('confirms the class a Z-Wave device got', () => {
    setDevice('ZWAV', { [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S2_AUTHENTICATED });
    render(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(screen.getByTestId('zwave-security-confirmed')).toHaveTextContent('Secured with S2 Authenticated.');
  });

  it('warns right away when the device was downgraded to S0', () => {
    setDevice('ZWAV', {
      [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S0,
      [ZWaveProtocol.ATTR_SECURITYREQUESTED]: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
    });
    render(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(screen.getByTestId('zwave-security-s0-downgrade')).toBeInTheDocument();
  });

  it('shows nothing for other protocols', () => {
    setDevice('ZIGB', { [ZWaveProtocol.ATTR_SECURITY]: ZWaveProtocol.SECURITY_S0 });
    render(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(screen.queryByTestId('paired-device-security')).not.toBeInTheDocument();
  });

  it('shows nothing until the device and its security class are known', () => {
    const { rerender } = render(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(screen.queryByTestId('paired-device-security')).not.toBeInTheDocument();

    setDevice('ZWAV');
    rerender(<PairedDeviceSecurity deviceAddress={ADDR} />);
    expect(screen.queryByTestId('paired-device-security')).not.toBeInTheDocument();
  });
});
