import { fireEvent, render, screen } from '@testing-library/react';
import { S2PinEntryForm } from '@/components/pairing/S2PinEntryForm';

// ── Helpers ───────────────────────────────────────────────────────────

const onPinChange = jest.fn();
const onSubmit = jest.fn();
const onScan = jest.fn();
const onDecline = jest.fn();

function renderForm(props: Partial<Parameters<typeof S2PinEntryForm>[0]> = {}) {
  return render(
    <S2PinEntryForm
      pin=""
      error={null}
      canScan
      onPinChange={onPinChange}
      onSubmit={onSubmit}
      onScan={onScan}
      onDecline={onDecline}
      {...props}
    />,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('S2PinEntryForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = renderForm({ pin: '515' });
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with an error and no scanning', () => {
    const { asFragment } = renderForm({ pin: '99999', error: 'Bad PIN', canScan: false });
    expect(asFragment()).toMatchSnapshot();
  });

  it('labels the PIN box', () => {
    renderForm();
    expect(screen.getByLabelText(/PIN: the first five digits/)).toHaveAttribute('inputmode', 'numeric');
  });

  it('keeps only digits, at most five', () => {
    renderForm();
    fireEvent.change(screen.getByTestId('s2-pin-input'), { target: { value: '12a3-4567' } });
    expect(onPinChange).toHaveBeenCalledWith('12345');
  });

  it('disables Submit until five digits are typed', () => {
    const { rerender } = renderForm({ pin: '1234' });
    expect(screen.getByTestId('s2-pin-submit')).toBeDisabled();
    rerender(
      <S2PinEntryForm pin="12345" error={null} canScan onPinChange={onPinChange} onSubmit={onSubmit} onScan={onScan} onDecline={onDecline} />,
    );
    expect(screen.getByTestId('s2-pin-submit')).toBeEnabled();
  });

  it('submits with the button or Enter', () => {
    renderForm({ pin: '12345' });
    fireEvent.click(screen.getByTestId('s2-pin-submit'));
    fireEvent.submit(screen.getByTestId('s2-pin-input'));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('shows an error tied to the input', () => {
    renderForm({ error: 'Bad PIN' });
    expect(screen.getByRole('alert')).toHaveTextContent('Bad PIN');
    expect(screen.getByTestId('s2-pin-input')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByTestId('s2-pin-input')).toHaveAttribute('aria-describedby', 's2-pin-error');
  });

  it('offers QR scanning', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('s2-pin-scan'));
    expect(onScan).toHaveBeenCalled();
  });

  it('hides QR scanning when the camera is unavailable', () => {
    renderForm({ canScan: false });
    expect(screen.queryByTestId('s2-pin-scan')).not.toBeInTheDocument();
  });

  it('offers to decline', () => {
    renderForm();
    fireEvent.click(screen.getByTestId('s2-pin-decline'));
    expect(onDecline).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
