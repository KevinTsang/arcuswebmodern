import { act, fireEvent, render, screen } from '@testing-library/react';
import { Base } from '@arcus/core';
import cornea from '@arcus/core/cornea';
import { S2PairingFailure } from '@/components/pairing/S2PairingFailure';
import { PAIRING_FAILED_EVENT } from '@/hooks/useS2PairingFailure';
import { S2_PIN_FAILED, S2_PIN_TIMEOUT } from '@/lib/zwaveS2';

const SUB = 'SERV:subpairing:place-1';

function emitFailed(code: string) {
  act(() => {
    cornea.emit(PAIRING_FAILED_EVENT, { [Base.ATTR_ADDRESS]: SUB, code });
  });
}

afterEach(() => {
  cornea.removeAllListeners(PAIRING_FAILED_EVENT);
});

describe('S2PairingFailure', () => {
  it('renders nothing until an S2 failure arrives', () => {
    const { container } = render(<S2PairingFailure pairingSubsystem={SUB} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('matches snapshot for a wrong PIN', () => {
    const { asFragment } = render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed(S2_PIN_FAILED);
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot for a timeout', () => {
    const { asFragment } = render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed(S2_PIN_TIMEOUT);
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains a wrong PIN and how to retry', () => {
    render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed(S2_PIN_FAILED);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('data-code', S2_PIN_FAILED);
    expect(alert).toHaveTextContent('Secure pairing failed');
    expect(alert).toHaveTextContent('usually means the PIN was wrong');
    expect(alert).toHaveTextContent('exclude the device');
    expect(alert).toHaveTextContent('factory reset');
  });

  it('explains a timeout', () => {
    render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed(S2_PIN_TIMEOUT);
    expect(screen.getByRole('alert')).toHaveTextContent('wasn’t entered in time');
  });

  it('ignores other failures', () => {
    render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed('pairing.unknown');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('can be dismissed', () => {
    render(<S2PairingFailure pairingSubsystem={SUB} />);
    emitFailed(S2_PIN_FAILED);
    fireEvent.click(screen.getByTestId('s2-pairing-failure-dismiss'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
