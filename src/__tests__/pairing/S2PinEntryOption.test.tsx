import { fireEvent, render, screen } from '@testing-library/react';
import { S2PinEntryOption } from '@/components/pairing/S2PinEntryOption';

const onChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('S2PinEntryOption', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<S2PinEntryOption skipPin={false} onChange={onChange} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('explains what pairing without the PIN means', () => {
    render(<S2PinEntryOption skipPin={false} onChange={onChange} />);
    expect(screen.getByLabelText(/Pair without the S2 PIN/)).not.toBeChecked();
    expect(screen.getByTestId('s2-pin-entry-option')).toHaveTextContent('S2 Unauthenticated or S0');
  });

  it('reports turning it on and off', () => {
    const { rerender } = render(<S2PinEntryOption skipPin={false} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('s2-pin-entry-skip'));
    expect(onChange).toHaveBeenLastCalledWith(true);

    rerender(<S2PinEntryOption skipPin onChange={onChange} />);
    expect(screen.getByTestId('s2-pin-entry-skip')).toBeChecked();
    fireEvent.click(screen.getByTestId('s2-pin-entry-skip'));
    expect(onChange).toHaveBeenLastCalledWith(false);
  });
});
