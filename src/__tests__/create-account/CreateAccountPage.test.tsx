import { render, screen } from '@testing-library/react';
import CreateAccountPage from '@/app/create-account/page';

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => null,
  useAppDispatch: () => jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/components/create-account/CredentialsStep', () => ({
  __esModule: true,
  default: () => <div data-testid="credentials-step">CredentialsStep</div>,
}));

jest.mock('@/components/create-account/AddressStep', () => ({
  __esModule: true,
  default: () => <div data-testid="address-step">AddressStep</div>,
}));

jest.mock('@/components/create-account/WelcomeStep', () => ({
  __esModule: true,
  default: () => <div data-testid="welcome-step">WelcomeStep</div>,
}));

jest.mock('@/components/ChangePinForm', () => ({
  __esModule: true,
  default: () => <div data-testid="pin-step">ChangePinForm</div>,
}));

describe('CreateAccountPage', () => {
  it('renders page title', () => {
    render(<CreateAccountPage />);
    expect(screen.getByText('Create Account')).toBeInTheDocument();
  });

  it('renders subtitle', () => {
    render(<CreateAccountPage />);
    expect(screen.getByText('Set up your Arcus Smart Home')).toBeInTheDocument();
  });

  it('renders step indicator with 4 steps', () => {
    render(<CreateAccountPage />);
    // First step is active (shows "1"), rest show numbers
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders credentials step by default', () => {
    render(<CreateAccountPage />);
    expect(screen.getByTestId('credentials-step')).toBeInTheDocument();
  });

  it('shows Account label for credentials step', () => {
    render(<CreateAccountPage />);
    expect(screen.getByText('Account')).toBeInTheDocument();
  });

  it('shows login link on credentials step', () => {
    render(<CreateAccountPage />);
    expect(screen.getByText('Log in')).toBeInTheDocument();
  });
});
