import { render, screen, fireEvent } from '@testing-library/react';
import ChangePinForm from '@/components/ChangePinForm';

const mockOnSave = jest.fn();
const mockOnSkip = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ChangePinForm – rendering', () => {
  it('shows default description and buttons', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    expect(screen.getByText('Set a PIN code to disarm your security alarm and unlock doors.')).toBeInTheDocument();
    expect(screen.getByText('Set PIN')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('renders PIN and Confirm PIN inputs', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    expect(screen.getByLabelText('PIN Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm PIN Code')).toBeInTheDocument();
  });

  it('accepts custom description and button labels', () => {
    render(
      <ChangePinForm
        onSave={mockOnSave}
        onSkip={mockOnSkip}
        description="Custom description"
        saveLabel="Save PIN"
        savingLabel="Saving…"
      />,
    );
    expect(screen.getByText('Custom description')).toBeInTheDocument();
    expect(screen.getByText('Save PIN')).toBeInTheDocument();
  });

  it('shows loading label when loading', () => {
    render(
      <ChangePinForm
        onSave={mockOnSave}
        onSkip={mockOnSkip}
        loading
        savingLabel="Working…"
      />,
    );
    expect(screen.getByText('Working…')).toBeInTheDocument();
  });

  it('displays external error', () => {
    render(
      <ChangePinForm
        onSave={mockOnSave}
        onSkip={mockOnSkip}
        error="PIN not available"
      />,
    );
    expect(screen.getByText('PIN not available')).toBeInTheDocument();
  });
});

describe('ChangePinForm – validation', () => {
  it('shows error when PIN is too short', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '12' } });
    fireEvent.change(confirmInput, { target: { value: '12' } });
    fireEvent.click(screen.getByText('Set PIN'));

    expect(screen.getByText('PIN must be 4-8 digits.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('shows error when PINs do not match', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '5678' } });
    fireEvent.click(screen.getByText('Set PIN'));

    expect(screen.getByText('PIN codes do not match.')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('strips non-digit characters from input', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code') as HTMLInputElement;

    fireEvent.change(pinInput, { target: { value: '12ab34' } });
    expect(pinInput.value).toBe('1234');
  });

  it('accepts 4-digit PIN', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '1234' } });
    fireEvent.change(confirmInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Set PIN'));

    expect(mockOnSave).toHaveBeenCalledWith('1234');
  });

  it('accepts 8-digit PIN', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '12345678' } });
    fireEvent.change(confirmInput, { target: { value: '12345678' } });
    fireEvent.click(screen.getByText('Set PIN'));

    expect(mockOnSave).toHaveBeenCalledWith('12345678');
  });
});

describe('ChangePinForm – callbacks', () => {
  it('calls onSave with valid PIN on submit', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    const pinInput = screen.getByLabelText('PIN Code');
    const confirmInput = screen.getByLabelText('Confirm PIN Code');

    fireEvent.change(pinInput, { target: { value: '5555' } });
    fireEvent.change(confirmInput, { target: { value: '5555' } });
    fireEvent.click(screen.getByText('Set PIN'));

    expect(mockOnSave).toHaveBeenCalledWith('5555');
  });

  it('calls onSkip when Skip is clicked', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(mockOnSkip).toHaveBeenCalled();
  });

  it('disables save button when loading', () => {
    render(<ChangePinForm onSave={mockOnSave} onSkip={mockOnSkip} loading />);
    expect(screen.getByText('Setting PIN…')).toBeDisabled();
  });
});
