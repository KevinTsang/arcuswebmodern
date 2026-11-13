import { fireEvent, render, screen } from '@testing-library/react';
import { S2QrResult } from '@/components/pairing/S2QrResult';

const handlers = {
  onSubmit: jest.fn(),
  onDecline: jest.fn(),
  onScanAgain: jest.fn(),
  onManual: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('S2QrResult – matching code', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<S2QrResult matched pin="51525" {...handlers} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows the PIN to send', () => {
    render(<S2QrResult matched pin="00042" {...handlers} />);
    expect(screen.getByTestId('s2-qr-pin')).toHaveTextContent('00042');
    expect(screen.queryByTestId('s2-qr-mismatch')).not.toBeInTheDocument();
  });

  it('sends the PIN on confirm', () => {
    render(<S2QrResult matched pin="51525" {...handlers} />);
    fireEvent.click(screen.getByTestId('s2-qr-submit'));
    expect(handlers.onSubmit).toHaveBeenCalled();
  });

  it('goes back to typing', () => {
    render(<S2QrResult matched pin="51525" {...handlers} />);
    fireEvent.click(screen.getByTestId('s2-qr-back'));
    expect(handlers.onManual).toHaveBeenCalled();
    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });
});

describe('S2QrResult – different device', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<S2QrResult matched={false} pin="51525" {...handlers} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('warns and never offers to send the PIN', () => {
    render(<S2QrResult matched={false} pin="51525" {...handlers} />);
    expect(screen.getByRole('alert')).toHaveTextContent("doesn't match the device that is joining");
    expect(screen.queryByTestId('s2-qr-submit')).not.toBeInTheDocument();
    expect(screen.queryByText('51525')).not.toBeInTheDocument();
  });

  it('offers to decline, scan again or type the PIN', () => {
    render(<S2QrResult matched={false} pin="51525" {...handlers} />);
    fireEvent.click(screen.getByTestId('s2-qr-decline'));
    fireEvent.click(screen.getByTestId('s2-qr-scan-again'));
    fireEvent.click(screen.getByTestId('s2-qr-manual'));
    expect(handlers.onDecline).toHaveBeenCalled();
    expect(handlers.onScanAgain).toHaveBeenCalled();
    expect(handlers.onManual).toHaveBeenCalled();
  });
});
