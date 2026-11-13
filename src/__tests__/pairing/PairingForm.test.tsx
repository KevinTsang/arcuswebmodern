import { render, screen, fireEvent } from '@testing-library/react';
import { PairingForm } from '@/components/pairing/PairingForm';
import type { PairingInput } from '@/arcus/types';

// ── Helpers ───────────────────────────────────────────────────────────

const mockChange = jest.fn();

const form: PairingInput[] = [
  { type: 'TEXT', name: 'sn', label: 'Serial Number', required: true, minlen: 4, maxlen: 12 },
  { type: 'TEXT', name: 'nick', label: 'Nickname' },
  { type: 'HIDDEN', name: 'model', label: 'Model', value: 'X1' },
];

const defaultProps = {
  form,
  values: { sn: '', nick: '', model: 'X1' },
  onChange: mockChange,
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('PairingForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<PairingForm {...defaultProps} />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('renders a labelled input for each visible field', () => {
      render(<PairingForm {...defaultProps} />);
      expect(screen.getByLabelText('Serial Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Nickname')).toBeInTheDocument();
    });

    it('does not render hidden fields', () => {
      render(<PairingForm {...defaultProps} />);
      expect(screen.queryByLabelText('Model')).not.toBeInTheDocument();
    });

    it('shows the current values and length limit', () => {
      render(<PairingForm {...defaultProps} values={{ sn: 'ABCD', nick: 'Den' }} />);
      expect(screen.getByLabelText('Serial Number')).toHaveValue('ABCD');
      expect(screen.getByLabelText('Serial Number')).toHaveAttribute('maxLength', '12');
      expect(screen.getByLabelText('Nickname')).toHaveValue('Den');
    });
  });

  describe('interactions', () => {
    it('reports changes by input name', () => {
      render(<PairingForm {...defaultProps} />);
      fireEvent.change(screen.getByLabelText('Serial Number'), { target: { value: 'AB12' } });
      expect(mockChange).toHaveBeenCalledWith('sn', 'AB12');
    });

    it('shows a required error once the field is left empty', () => {
      render(<PairingForm {...defaultProps} />);
      expect(screen.queryByTestId('pairing-form-sn-error')).not.toBeInTheDocument();
      fireEvent.blur(screen.getByLabelText('Serial Number'));
      expect(screen.getByTestId('pairing-form-sn-error')).toHaveTextContent('Serial Number is required');
      expect(screen.getByLabelText('Serial Number')).toHaveAttribute('aria-invalid', 'true');
    });

    it('shows a length error for a short value', () => {
      render(<PairingForm {...defaultProps} values={{ sn: 'AB', nick: '' }} />);
      fireEvent.blur(screen.getByLabelText('Serial Number'));
      expect(screen.getByTestId('pairing-form-sn-error')).toHaveTextContent('at least 4 characters');
    });

    it('shows no error for a valid value', () => {
      render(<PairingForm {...defaultProps} values={{ sn: 'ABCD', nick: '' }} />);
      fireEvent.blur(screen.getByLabelText('Serial Number'));
      fireEvent.blur(screen.getByLabelText('Nickname'));
      expect(screen.queryByTestId('pairing-form-sn-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('pairing-form-nick-error')).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders nothing when every field is hidden', () => {
      const { container } = render(
        <PairingForm form={[{ type: 'HIDDEN', name: 'model', label: 'Model' }]} values={{}} onChange={mockChange} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for an empty form', () => {
      const { container } = render(<PairingForm form={[]} values={{}} onChange={mockChange} />);
      expect(container).toBeEmptyDOMElement();
    });

    it('treats a missing value as empty', () => {
      render(<PairingForm {...defaultProps} values={{}} />);
      expect(screen.getByLabelText('Serial Number')).toHaveValue('');
    });
  });
});
