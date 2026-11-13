import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SendCodeForm } from '@/components/login/SendCodeForm';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: mockPush, back: mockBack }),
}));

const mockSendPasswordReset = jest.fn();

jest.mock('@arcus/core/services', () => ({
  PersonService: {
    SendPasswordReset: (email: string, method: string) => mockSendPasswordReset(email, method),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────

function enterEmail(value: string) {
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value } });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSendPasswordReset.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('SendCodeForm', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<SendCodeForm />);
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('renders the heading, email field, buttons and support-code link', () => {
      render(<SendCodeForm />);
      expect(screen.getByRole('heading', { name: 'Forgot Password' })).toBeInTheDocument();
      expect(screen.getByLabelText('Email Address')).toHaveAttribute('type', 'email');
      expect(screen.getByTestId('reset-send')).toHaveTextContent('Send Email');
      expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Already have a code from Support? Click here.' })).toHaveAttribute(
        'href',
        '/login?view=reset-password',
      );
    });
  });

  describe('submitting', () => {
    it('sends the reset email and moves to the reset step with the email', async () => {
      render(<SendCodeForm />);
      enterEmail('alex+home@example.com');
      fireEvent.click(screen.getByTestId('reset-send'));

      await waitFor(() =>
        expect(mockPush).toHaveBeenCalledWith(
          '/login?view=reset-password&email=alex%2Bhome%40example.com&fromSendCode=1',
        ),
      );
      expect(mockSendPasswordReset).toHaveBeenCalledWith('alex+home@example.com', 'email');
    });

    it('shows "Sending..." and disables the button while sending', async () => {
      mockSendPasswordReset.mockReturnValueOnce(new Promise(() => {}));
      render(<SendCodeForm />);
      enterEmail('alex@example.com');
      fireEvent.click(screen.getByTestId('reset-send'));

      await waitFor(() => expect(screen.getByTestId('reset-send')).toBeDisabled());
      expect(screen.getByTestId('reset-send')).toHaveTextContent('Sending...');
    });

    it('shows an error and stays on the step when sending fails', async () => {
      mockSendPasswordReset.mockRejectedValueOnce(new Error('fail'));
      render(<SendCodeForm />);
      enterEmail('alex@example.com');
      fireEvent.click(screen.getByTestId('reset-send'));

      expect(
        await screen.findByText('An error occurred sending the reset code. Please try again later.'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('reset-send')).not.toBeDisabled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('goes back when Back is clicked', () => {
      render(<SendCodeForm />);
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('does not send with an empty email', () => {
      render(<SendCodeForm />);
      fireEvent.click(screen.getByTestId('reset-send'));

      expect(mockSendPasswordReset).not.toHaveBeenCalled();
      expect(screen.getByText("can't be blank")).toBeInTheDocument();
    });

    it('flags an invalid email on blur and does not send it', () => {
      render(<SendCodeForm />);
      enterEmail('nope');
      fireEvent.blur(screen.getByLabelText('Email Address'));
      expect(screen.getByText('is invalid')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('reset-send'));
      expect(mockSendPasswordReset).not.toHaveBeenCalled();
    });
  });
});
