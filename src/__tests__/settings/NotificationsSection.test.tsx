import { render, screen } from '@testing-library/react';
import { NotificationsSection } from '@/components/settings/NotificationsSection';

// ── Mocks ─────────────────────────────────────────────────────────────

let mockPerson: { personId: string } | null = null;

jest.mock('@/store/hooks', () => ({
  useAppSelector: (sel: (s: any) => any) => sel({ auth: { person: mockPerson } }),
}));

// Each card is covered by its own test file.
jest.mock('@/components/settings/AlarmCallTreeCard', () => ({
  AlarmCallTreeCard: () => <div data-testid="alarm-call-tree-card" />,
}));
jest.mock('@/components/settings/PushNotificationsCard', () => ({
  PushNotificationsCard: ({ personId }: { personId: string }) => <div data-testid="push-card">{personId}</div>,
}));
jest.mock('@/components/settings/EmailNotificationsCard', () => ({
  EmailNotificationsCard: ({ personId }: { personId: string }) => <div data-testid="email-card">{personId}</div>,
}));
jest.mock('@/components/settings/QuietHoursCard', () => ({
  QuietHoursCard: () => <div data-testid="quiet-hours-card" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPerson = { personId: 'p1' };
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('NotificationsSection', () => {
  it('matches snapshot', () => {
    const { asFragment } = render(<NotificationsSection />);
    expect(asFragment()).toMatchSnapshot();
  });

  it('shows every notification card for the signed-in person', () => {
    render(<NotificationsSection />);
    expect(screen.getByTestId('alarm-call-tree-card')).toBeInTheDocument();
    expect(screen.getByTestId('push-card')).toHaveTextContent('p1');
    expect(screen.getByTestId('email-card')).toHaveTextContent('p1');
    expect(screen.getByTestId('quiet-hours-card')).toBeInTheDocument();
  });

  it('shows a loading message without a signed-in person', () => {
    mockPerson = null;
    render(<NotificationsSection />);
    expect(screen.getByTestId('notifications-signed-out')).toBeInTheDocument();
    expect(screen.queryByTestId('push-card')).not.toBeInTheDocument();
  });
});
