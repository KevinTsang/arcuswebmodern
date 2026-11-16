import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Base, Person } from '@arcus/core';
import EmailCard from '@/components/settings/EmailCard';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockOpenRight = jest.fn();
const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();
const mockRestfulRequest = jest.fn();
let mockPerson: { personId: string; [Person.ATTR_EMAIL]?: string } | null = null;

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: {
    request: (...args: any[]) => mockBridgeRequest(...args),
    restfulRequest: (...args: any[]) => mockRestfulRequest(...args),
  },
}));

jest.mock('@/components/settings/ChangeEmailPanel', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/SidePanel', () => ({
  useSidePanel: () => ({ openRight: mockOpenRight }),
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ auth: { person: mockPerson } }),
  useAppDispatch: () => mockDispatch,
}));

// ── Helpers ───────────────────────────────────────────────────────────

const status = () => screen.getByTestId('info-card-email-value-status');
const emailValue = () => screen.getByTestId('info-card-email-value-email');
const changeButton = () => screen.getByRole('button', { name: 'Change' });

interface PanelProps {
  personId: string;
  currentEmail: string;
  onSaved: (email: string) => void;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = { personId: 'p1', [Person.ATTR_EMAIL]: 'alex@example.com' };
  mockBridgeRequest.mockResolvedValue({ [Person.ATTR_EMAIL]: 'alex@example.com' });
  mockRestfulRequest.mockResolvedValue({});
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('EmailCard', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<EmailCard />);
    await waitFor(() => expect(status()).toHaveTextContent('Not verified'));
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('loads the person to show the verification status', async () => {
      render(<EmailCard />);
      expect(status()).toHaveTextContent('Checking…');
      expect(emailValue()).toHaveTextContent('alex@example.com');
      await waitFor(() => expect(status()).toHaveTextContent('Not verified'));
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, 'SERV:person:p1', {});
      expect(screen.getByTestId('email-send-verification')).toBeInTheDocument();
    });

    it('shows a verified email without the send button', async () => {
      mockBridgeRequest.mockResolvedValueOnce({
        [Person.ATTR_EMAIL]: 'alex@example.com',
        [Person.ATTR_EMAILVERIFIED]: 1700000000000,
      });
      render(<EmailCard />);
      await waitFor(() => expect(status()).toHaveTextContent('Verified'));
      expect(screen.queryByTestId('email-send-verification')).not.toBeInTheDocument();
    });

    it('prefers the email the platform reports', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ [Person.ATTR_EMAIL]: 'new@example.com' });
      render(<EmailCard />);
      await waitFor(() => expect(emailValue()).toHaveTextContent('new@example.com'));
    });

    it('falls back to the session email when the platform omits it', async () => {
      mockBridgeRequest.mockResolvedValueOnce({});
      render(<EmailCard />);
      await waitFor(() => expect(status()).toHaveTextContent('Not verified'));
      expect(emailValue()).toHaveTextContent('alex@example.com');
    });

    it('shows a dash with no email and does not load without a person', () => {
      mockPerson = null;
      render(<EmailCard />);
      expect(emailValue()).toHaveTextContent('—');
      expect(changeButton()).toBeDisabled();
      expect(mockBridgeRequest).not.toHaveBeenCalled();
    });
  });

  describe('load failure', () => {
    it('shows an unknown status and an error toast', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<EmailCard />);
      await waitFor(() => expect(status()).toHaveTextContent('—'));
      expect(emailValue()).toHaveTextContent('alex@example.com');
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'error', message: 'Failed to load email verification status.' },
      });
      expect(screen.queryByTestId('email-send-verification')).not.toBeInTheDocument();
    });
  });

  describe('sending a verification email', () => {
    it('asks the platform to send one', async () => {
      render(<EmailCard />);
      fireEvent.click(await screen.findByTestId('email-send-verification'));
      await waitFor(() =>
        expect(mockRestfulRequest).toHaveBeenCalledWith(Person.CMD_SENDVERIFICATIONEMAIL, 'SERV:person:p1', { source: 'WEB' }));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'ui/addNotification',
        payload: { type: 'success', message: 'Verification email sent to alex@example.com.' },
      });
    });

    it('reports a failure', async () => {
      mockRestfulRequest.mockRejectedValueOnce(new Error('fail'));
      render(<EmailCard />);
      fireEvent.click(await screen.findByTestId('email-send-verification'));
      await waitFor(() =>
        expect(mockDispatch).toHaveBeenCalledWith({
          type: 'ui/addNotification',
          payload: { type: 'error', message: 'Failed to send verification email.' },
        }));
      expect(screen.getByTestId('email-send-verification')).not.toBeDisabled();
    });
  });

  describe('changing the email', () => {
    it('opens ChangeEmailPanel with the current email', async () => {
      render(<EmailCard />);
      await waitFor(() => expect(status()).toHaveTextContent('Not verified'));
      fireEvent.click(changeButton());
      expect(mockOpenRight).toHaveBeenCalledWith(expect.anything(), { title: 'Change Email', key: 'change-email' });
      const props = (mockOpenRight.mock.calls[0][0] as ReactElement<PanelProps>).props;
      expect(props).toMatchObject({ personId: 'p1', currentEmail: 'alex@example.com' });
    });

    it('shows the new email as unverified once saved', async () => {
      mockBridgeRequest.mockResolvedValueOnce({ [Person.ATTR_EMAIL]: 'alex@example.com', [Person.ATTR_EMAILVERIFIED]: 1 });
      render(<EmailCard />);
      await waitFor(() => expect(status()).toHaveTextContent('Verified'));
      fireEvent.click(changeButton());
      const props = (mockOpenRight.mock.calls[0][0] as ReactElement<PanelProps>).props;
      act(() => props.onSaved('new@example.com'));

      expect(emailValue()).toHaveTextContent('new@example.com');
      expect(status()).toHaveTextContent('Not verified');
    });
  });
});
