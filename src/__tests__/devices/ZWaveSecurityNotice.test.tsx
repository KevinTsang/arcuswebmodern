import { render, screen } from '@testing-library/react';
import { ZWaveProtocol } from '@arcus/core';
import { ZWaveSecurityNotice } from '@/components/devices/ZWaveSecurityNotice';
import type { ZWaveSecurityInfo } from '@/lib/zwaveSecurity';

// ── Helpers ───────────────────────────────────────────────────────────

function info(overrides: Partial<ZWaveSecurityInfo>): ZWaveSecurityInfo {
  return { granted: null, requested: null, downgraded: false, s0Downgrade: false, ...overrides };
}

const S0_DOWNGRADE = info({
  granted: ZWaveProtocol.SECURITY_S0,
  requested: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL,
  downgraded: true,
  s0Downgrade: true,
});

const S2_DOWNGRADE = info({
  granted: ZWaveProtocol.SECURITY_S2_UNAUTHENTICATED,
  requested: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
  downgraded: true,
});

const FULL = info({
  granted: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
  requested: ZWaveProtocol.SECURITY_S2_AUTHENTICATED,
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('ZWaveSecurityNotice', () => {
  it('matches snapshot for an S0 downgrade', () => {
    const { asFragment } = render(<ZWaveSecurityNotice security={S0_DOWNGRADE} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot for a downgrade within S2', () => {
    const { asFragment } = render(<ZWaveSecurityNotice security={S2_DOWNGRADE} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('calls out an S2 device that ended up on S0 as an alert, without blaming the PIN', () => {
    render(<ZWaveSecurityNotice security={S0_DOWNGRADE} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-testid', 'zwave-security-s0-downgrade');
    expect(alert).toHaveTextContent('Security downgraded to S0 (legacy)');
    expect(alert).toHaveTextContent('supports S2 Access Control but joined with S0 (legacy) only');
    expect(alert).not.toHaveTextContent('PIN');
  });

  it('names both classes for a downgrade within S2', () => {
    render(<ZWaveSecurityNotice security={S2_DOWNGRADE} />);
    expect(screen.getByTestId('device-security-downgraded')).toHaveTextContent(
      'joined with S2 Unauthenticated instead of the S2 Authenticated it asked for',
    );
  });

  it('confirms full security only when asked to', () => {
    const { container, rerender } = render(<ZWaveSecurityNotice security={FULL} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<ZWaveSecurityNotice security={FULL} confirm />);
    expect(screen.getByTestId('zwave-security-confirmed')).toHaveTextContent('Secured with S2 Authenticated.');
  });

  it('confirms nothing when the granted class is unknown', () => {
    const { container } = render(
      <ZWaveSecurityNotice security={info({ requested: ZWaveProtocol.SECURITY_S2_ACCESS_CONTROL })} confirm />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('applies className', () => {
    render(<ZWaveSecurityNotice security={S2_DOWNGRADE} className="mb-8" />);
    expect(screen.getByTestId('device-security-downgraded')).toHaveClass('mb-8');
  });
});
