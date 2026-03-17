import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WelcomeStep from '@/components/create-account/WelcomeStep';
import { CreateAccountProvider } from '@/components/create-account/CreateAccountContext';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const mockDispatch = jest.fn(() => ({ unwrap: () => Promise.resolve() }));

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => null,
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@/store/thunks/loadPlaceDataThunk', () => ({
  loadPlaceDataThunk: jest.fn((id: string) => ({ type: 'loadPlaceData', payload: id })),
}));

jest.mock('@/store/thunks/logoutThunk', () => ({
  logoutThunk: jest.fn(() => ({ type: 'auth/logout' })),
}));

function renderStep({ placeId }: { placeId?: string } = {}) {
  return render(
    <CreateAccountProvider initialStateOverride={placeId ? { placeId } : undefined}>
      <WelcomeStep />
    </CreateAccountProvider>,
  );
}

describe('WelcomeStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders welcome message', () => {
    renderStep();
    expect(screen.getByText(/Welcome/)).toBeInTheDocument();
  });

  it('renders description', () => {
    renderStep();
    expect(screen.getByText(/Your Arcus Smart Home account is ready/)).toBeInTheDocument();
  });

  it('renders Go to Dashboard button', () => {
    renderStep();
    expect(screen.getByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  });

  it('navigates to dashboard when placeId is set and load succeeds', async () => {
    renderStep({ placeId: 'place-1' });
    fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  describe('when account setup fails', () => {
    beforeEach(async () => {
      renderStep();
      fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
      });
    });

    it('does not navigate away', () => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('replaces Go to Dashboard with Back to Login button', () => {
      expect(screen.queryByRole('button', { name: 'Go to Dashboard' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });

    it('logs out and redirects to login when Back to Login is clicked', async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back to Login' }));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('when loadPlaceDataThunk fails', () => {
    beforeEach(async () => {
      mockDispatch.mockImplementationOnce(() => ({
        unwrap: () => Promise.reject(new Error('load failed')),
      }));
      renderStep({ placeId: 'place-1' });
      fireEvent.click(screen.getByRole('button', { name: 'Go to Dashboard' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
      });
    });

    it('does not navigate away', () => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('replaces Go to Dashboard with Back to Login button', () => {
      expect(screen.queryByRole('button', { name: 'Go to Dashboard' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument();
    });

    it('logs out and redirects to login when Back to Login is clicked', async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Back to Login' }));
      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/login');
      });
    });
  });
});
