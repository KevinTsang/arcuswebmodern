import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Base, Person } from '@arcus/core';
import { EmailNotificationsCard } from '@/components/settings/EmailNotificationsCard';

// ── Mocks ─────────────────────────────────────────────────────────────

const mockDispatch = jest.fn();
const mockBridgeRequest = jest.fn();

jest.mock('@arcus/core/bridge', () => ({
  __esModule: true,
  default: { request: (...args: any[]) => mockBridgeRequest(...args) },
}));

jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/slices/uiSlice', () => ({
  addNotification: (payload: unknown) => ({ type: 'ui/addNotification', payload }),
}));

// ── Helpers ───────────────────────────────────────────────────────────

const PERSON = 'SERV:person:p1';
const NOW = 1_700_000_000_000;

const errorToast = (message: string) => ({ type: 'ui/addNotification', payload: { type: 'error', message } });

function mockPerson(consent: number | undefined) {
  mockBridgeRequest.mockImplementation((cmd: string) =>
    Promise.resolve(cmd === Base.CMD_GETATTRIBUTES
      ? { [Person.ATTR_EMAIL]: 'alex@example.com', [Person.ATTR_CONSENTOFFERSPROMOTIONS]: consent }
      : {}));
}

const toggle = () => screen.findByTestId('email-prefs-promotions');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockPerson(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('EmailNotificationsCard', () => {
  it('matches snapshot', async () => {
    const { asFragment } = render(<EmailNotificationsCard personId="p1" />);
    await toggle();
    expect(asFragment()).toMatchSnapshot();
  });

  describe('rendering', () => {
    it('loads the person and shows opted out', async () => {
      render(<EmailNotificationsCard personId="p1" />);
      expect(screen.getByTestId('email-prefs-loading')).toBeInTheDocument();
      expect(await toggle()).toHaveAttribute('aria-checked', 'false');
      expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_GETATTRIBUTES, PERSON, {});
      expect(screen.getByTestId('email-prefs-note')).toHaveTextContent('alex@example.com');
    });

    it('shows opted in when consent has a timestamp', async () => {
      mockPerson(NOW - 1000);
      render(<EmailNotificationsCard personId="p1" />);
      expect(await toggle()).toHaveAttribute('aria-checked', 'true');
    });

    it('treats missing consent and email as opted out with a generic address', async () => {
      mockBridgeRequest.mockResolvedValueOnce({});
      render(<EmailNotificationsCard personId="p1" />);
      expect(await toggle()).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByTestId('email-prefs-note')).toHaveTextContent('your email address');
    });

    it('shows an error and toast when loading fails, and retries', async () => {
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      render(<EmailNotificationsCard personId="p1" />);
      expect(await screen.findByTestId('email-prefs-error')).toBeInTheDocument();
      expect(mockDispatch).toHaveBeenCalledWith(errorToast('Failed to load email preferences.'));

      fireEvent.click(screen.getByTestId('email-prefs-retry'));
      expect(await toggle()).toBeInTheDocument();
    });
  });

  describe('toggling promotional emails', () => {
    it('opts in with the current time', async () => {
      render(<EmailNotificationsCard personId="p1" />);
      fireEvent.click(await toggle());
      expect(screen.getByTestId('email-prefs-promotions')).toHaveAttribute('aria-checked', 'true');
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, PERSON, {
        [Person.ATTR_CONSENTOFFERSPROMOTIONS]: NOW,
      }));
    });

    it('opts out with 0', async () => {
      mockPerson(NOW - 1000);
      render(<EmailNotificationsCard personId="p1" />);
      fireEvent.click(await toggle());
      await waitFor(() => expect(mockBridgeRequest).toHaveBeenCalledWith(Base.CMD_SETATTRIBUTES, PERSON, {
        [Person.ATTR_CONSENTOFFERSPROMOTIONS]: 0,
      }));
      expect(screen.getByTestId('email-prefs-promotions')).toHaveAttribute('aria-checked', 'false');
    });

    it('reverts and shows an error toast when saving fails', async () => {
      render(<EmailNotificationsCard personId="p1" />);
      const sw = await toggle();
      mockBridgeRequest.mockRejectedValueOnce(new Error('fail'));
      fireEvent.click(sw);
      await waitFor(() => expect(mockDispatch).toHaveBeenCalledWith(errorToast('Failed to update email preferences.')));
      expect(screen.getByTestId('email-prefs-promotions')).toHaveAttribute('aria-checked', 'false');
    });

    it('ignores clicks while a save is in flight', async () => {
      render(<EmailNotificationsCard personId="p1" />);
      const sw = await toggle();
      let resolveSave: (v: object) => void = () => {};
      mockBridgeRequest.mockImplementationOnce(() => new Promise((r) => { resolveSave = r; }));
      fireEvent.click(sw);
      fireEvent.click(sw);
      const setCalls = () => mockBridgeRequest.mock.calls.filter(([cmd]) => cmd === Base.CMD_SETATTRIBUTES);
      expect(setCalls()).toHaveLength(1);
      resolveSave({});
      await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
    });
  });
});
