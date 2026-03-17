import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '@/app/(authenticated)/settings/page';

// Mock section components to isolate tab navigation testing.
// Deep rendering is covered by individual section tests.
jest.mock('@/components/settings/ProfileSection', () => ({
  __esModule: true,
  default: () => <div data-testid="profile-section">Profile Content</div>,
}));

jest.mock('@/components/settings/PeoplePlacesSection', () => ({
  __esModule: true,
  default: () => <div data-testid="people-places-section">People &amp; Places Content</div>,
}));

jest.mock('@/components/settings/InvitationSection', () => ({
  __esModule: true,
  default: () => <div data-testid="invitation-section">Invitation Content</div>,
}));

describe('SettingsPage – rendering', () => {
  it('shows Settings heading', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows all three tab buttons', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('People & Places')).toBeInTheDocument();
    expect(screen.getByText('Invitation Code')).toBeInTheDocument();
  });
});

describe('SettingsPage – tab navigation', () => {
  it('shows Profile section by default', () => {
    render(<SettingsPage />);
    expect(screen.getByTestId('profile-section')).toBeInTheDocument();
    expect(screen.queryByTestId('people-places-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('invitation-section')).not.toBeInTheDocument();
  });

  it('switches to People & Places on tab click', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    expect(screen.getByTestId('people-places-section')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-section')).not.toBeInTheDocument();
  });

  it('switches to Invitation Code on tab click', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Invitation Code'));
    expect(screen.getByTestId('invitation-section')).toBeInTheDocument();
    expect(screen.queryByTestId('profile-section')).not.toBeInTheDocument();
  });

  it('switches back to Profile from another tab', () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('People & Places'));
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByTestId('profile-section')).toBeInTheDocument();
    expect(screen.queryByTestId('people-places-section')).not.toBeInTheDocument();
  });
});
